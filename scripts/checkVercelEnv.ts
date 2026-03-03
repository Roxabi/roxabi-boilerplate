#!/usr/bin/env bun
/**
 * checkVercelEnv.ts — Audit Vercel env vars before promoting a release.
 *
 * Usage: bun run scripts/checkVercelEnv.ts [production|preview]
 *
 * Required env:
 *   VERCEL_TOKEN       — Vercel API token with project read access
 *   VERCEL_TEAM_SLUG   — team slug (default: "roxabi")
 *   VERCEL_API_PROJECT — project name (default: "roxabi-api")
 */

const target = (process.argv[2] ?? 'production') as 'production' | 'preview'

const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const TEAM_SLUG = process.env.VERCEL_TEAM_SLUG ?? 'roxabi'
const PROJECT = process.env.VERCEL_API_PROJECT ?? 'roxabi-api'

if (!VERCEL_TOKEN) {
  console.error('Error: VERCEL_TOKEN is not set.')
  console.error('Set it in your .env file or export it before running this script.')
  process.exit(1)
}

// Required vars derived from apps/api/src/config/env.validation.ts
// - production: BETTER_AUTH_SECRET (validateAuthSecret), RESEND_API_KEY (validateResendApiKey),
//               CRON_SECRET (validateSecurityWarnings), DATABASE_URL (runtime),
//               KV_REST_API_URL + KV_REST_API_TOKEN (validateRateLimitRedis)
// - preview:    BETTER_AUTH_SECRET, RESEND_API_KEY, CRON_SECRET, DATABASE_URL
//               KV vars skipped — rate limiting falls back to memory store on preview
const REQUIRED_VARS: Record<'production' | 'preview', string[]> = {
  production: [
    'BETTER_AUTH_SECRET',
    'RESEND_API_KEY',
    'CRON_SECRET',
    'DATABASE_URL',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
  ],
  preview: ['BETTER_AUTH_SECRET', 'RESEND_API_KEY', 'CRON_SECRET', 'DATABASE_URL'],
}

const required = REQUIRED_VARS[target]

console.log(`Checking Vercel env vars for project "${PROJECT}" (target: ${target})…`)
console.log(`Team: ${TEAM_SLUG}`)
console.log()

// decrypt=true returns actual values when the token has sufficient permissions,
// allowing semantic checks (e.g. BETTER_AUTH_URL == APP_URL).
const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(PROJECT)}/env?teamSlug=${encodeURIComponent(TEAM_SLUG)}&target=${target}&decrypt=true`

const response = await fetch(url, {
  headers: {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  },
})

if (!response.ok) {
  const body = await response.text()
  console.error(`Error: Vercel API returned ${response.status} ${response.statusText}`)
  console.error(body)
  process.exit(1)
}

const data = (await response.json()) as {
  envs: Array<{ key: string; value: string; target: string[] }>
}

// Collect all env vars declared for this target
const declaredEnvs = data.envs.filter(
  (e) => e.target.includes(target) || e.target.includes('production')
)
const declaredKeys = new Set(declaredEnvs.map((e) => e.key))
const envMap = new Map(declaredEnvs.map((e) => [e.key, e.value]))

const missing = required.filter((k) => !declaredKeys.has(k))
const present = required.filter((k) => declaredKeys.has(k))

console.log(`Present (${present.length}/${required.length}):`)
for (const key of present) {
  console.log(`  ✓ ${key}`)
}

let failed = missing.length > 0

if (missing.length > 0) {
  console.log()
  console.log(`Missing (${missing.length}):`)
  for (const key of missing) {
    console.log(`  ✗ ${key}`)
  }
}

// Semantic check: BETTER_AUTH_URL must equal APP_URL.
// better-auth resolves relative callbackURLs (e.g. /dashboard) against its baseURL.
// If BETTER_AUTH_URL points to the API domain instead of the web app, post-auth
// redirects land on the API (404) instead of the frontend.
const betterAuthUrl = envMap.get('BETTER_AUTH_URL')
const appUrl = envMap.get('APP_URL')

// Values that don't start with http are still encrypted (decrypt=true needs a higher-privilege token).
// In that case, skip the semantic check rather than block CI with a false negative.
const isUrl = (v: string) => v.startsWith('http://') || v.startsWith('https://')

if (betterAuthUrl && appUrl) {
  if (!(isUrl(betterAuthUrl) && isUrl(appUrl))) {
    console.log()
    console.log('  ⚠ BETTER_AUTH_URL / APP_URL values are encrypted — skipping equality check.')
    console.log('    Re-run with a token that has decrypt access to enable this check.')
  } else {
    const normalise = (u: string) => u.replace(/\/+$/, '')
    if (normalise(betterAuthUrl) !== normalise(appUrl)) {
      console.log()
      console.error('Mismatch: BETTER_AUTH_URL ≠ APP_URL')
      console.error(`  BETTER_AUTH_URL = ${betterAuthUrl}`)
      console.error(`  APP_URL         = ${appUrl}`)
      console.error(
        'BETTER_AUTH_URL must equal APP_URL (the web app URL). ' +
          'better-auth resolves relative callbackURLs against BETTER_AUTH_URL — ' +
          'if it points to the API domain, post-auth redirects return 404.'
      )
      failed = true
    } else {
      console.log()
      console.log(`  ✓ BETTER_AUTH_URL == APP_URL (${appUrl})`)
    }
  }
}

if (failed) {
  console.log()
  console.error(`One or more checks failed for target "${target}".`)
  console.error(
    'Fix env vars at: https://vercel.com/dashboard → Project → Settings → Environment Variables'
  )
  process.exit(1)
}

console.log()
console.log(`All checks passed for target "${target}". ✓`)
