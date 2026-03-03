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

const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(PROJECT)}/env?teamSlug=${encodeURIComponent(TEAM_SLUG)}&target=${target}`

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

const data = (await response.json()) as { envs: Array<{ key: string; target: string[] }> }

// Collect all keys declared for this target (envs can target multiple environments)
const declaredKeys = new Set(
  data.envs
    .filter((e) => e.target.includes(target) || e.target.includes('production'))
    .map((e) => e.key)
)

const missing = required.filter((k) => !declaredKeys.has(k))
const present = required.filter((k) => declaredKeys.has(k))

console.log(`Present (${present.length}/${required.length}):`)
for (const key of present) {
  console.log(`  ✓ ${key}`)
}

if (missing.length > 0) {
  console.log()
  console.log(`Missing (${missing.length}):`)
  for (const key of missing) {
    console.log(`  ✗ ${key}`)
  }
  console.log()
  console.error(
    `Error: ${missing.length} required env var(s) not declared in Vercel for target "${target}".`
  )
  console.error(
    'Add them at: https://vercel.com/dashboard → Project → Settings → Environment Variables'
  )
  process.exit(1)
}

console.log()
console.log(`All required env vars are declared for target "${target}". ✓`)
