#!/usr/bin/env bun
/**
 * Env Sync Check Script
 *
 * Compares Zod env schemas (API, web server, web client) against .env.example
 * to ensure all declared env vars are documented and vice versa.
 * Also cross-validates schema keys against turbo config declarations
 * (root + app-level env/passThroughEnv) to catch env var drift.
 *
 * Run with: bun run scripts/checkEnvSync.ts
 *
 * Exit codes:
 * - 0: All schemas are in sync with .env.example
 * - 1: Missing or undocumented env vars found
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const ENV_EXAMPLE_PATH = join(ROOT, '.env.example')

/**
 * Keys that are tooling-only, platform-injected, or not expected in .env.example.
 * These are excluded from both "missing from .env.example" errors and
 * "not in any schema" warnings.
 */
const TOOLING_ALLOWLIST = new Set([
  'WEB_PORT',
  'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS',
  'GITHUB_TOKEN',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'VERCEL_ENV',
  'NODE_ENV',
  // Vercel deploy tooling — used by /deploy skill, not app runtime
  'VERCEL_TOKEN',
  'VERCEL_PROJECT_ID',
  'VERCEL_TEAM_ID',
  // GitHub Projects issue-triage tooling — used by dev-core scripts
  'GITHUB_REPO',
  'GH_PROJECT_ID',
  'STATUS_FIELD_ID',
  'SIZE_FIELD_ID',
  'PRIORITY_FIELD_ID',
  'STATUS_OPTIONS_JSON',
  'SIZE_OPTIONS_JSON',
  'PRIORITY_OPTIONS_JSON',
])

/** Prefix for client-side environment variables exposed by Vite. */
// biome-ignore lint/correctness/noUnusedVariables: documentation constant for future use
const CLIENT_ENV_PREFIX = 'VITE_'

/** Parse .env.example: extract keys from both uncommented and commented lines. */
async function parseEnvExample(): Promise<Set<string>> {
  const content = await readFile(ENV_EXAMPLE_PATH, 'utf-8')
  const keys = new Set<string>()

  for (const raw of content.split('\n')) {
    let line = raw.trim()
    if (line === '' || line.startsWith('# =')) continue

    // Strip leading comment marker (e.g. "# GOOGLE_CLIENT_ID=" → "GOOGLE_CLIENT_ID=")
    if (line.startsWith('# ')) {
      line = line.slice(2)
    }

    const match = line.match(/^([A-Z][A-Z0-9_]*)=/)
    if (match) {
      keys.add(match[1])
    }
  }

  return keys
}

/** Collect keys from a Zod schema's shape object. */
function schemaKeys(schema: { shape: Record<string, unknown> }): string[] {
  return Object.keys(schema.shape)
}

/** Check that the vite.config.ts inline schema matches clientEnvSchema. */
async function checkViteConfigDrift(clientSchemaKeys: string[]): Promise<{ errors: string[] }> {
  const errors: string[] = []
  const viteConfigPath = join(ROOT, 'apps/web/vite.config.ts')
  const viteConfigContent = await readFile(viteConfigPath, 'utf-8')

  const viteSchemaMatch = viteConfigContent.match(/const schema = z\.object\(\{([^}]+)\}\)/)
  if (!viteSchemaMatch) {
    console.warn('WARN: Could not find inline schema in vite.config.ts — skipping drift check')
    return { errors }
  }

  const viteKeys = new Set([...viteSchemaMatch[1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]))
  const clientKeys = new Set(clientSchemaKeys)

  for (const key of clientKeys) {
    if (!viteKeys.has(key)) {
      errors.push(`${key} is in clientEnvSchema but missing from vite.config.ts inline schema`)
    }
  }
  for (const key of viteKeys) {
    if (!clientKeys.has(key)) {
      errors.push(`${key} is in vite.config.ts inline schema but missing from clientEnvSchema`)
    }
  }

  return { errors }
}

/** Find the index of the first `//` outside a JSON string, or -1 if none. */
export function findLineCommentStart(line: string): number {
  let inString = false
  let isEscaped = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (isEscaped) {
      isEscaped = false
      continue
    }

    if (ch === '\\' && inString) {
      isEscaped = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    if (!inString && ch === '/' && i + 1 < line.length && line[i + 1] === '/') {
      return i
    }
  }

  return -1
}

// Note: Only strips single-line // comments. Block comments (/* */) are not supported.
/** Strip single-line // comments from JSONC, avoiding // inside strings. */
export function stripJsoncComments(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const idx = findLineCommentStart(line)
      return idx === -1 ? line : line.slice(0, idx)
    })
    .join('\n')
}

/** Read and parse a JSONC or JSON turbo config file. */
async function parseTurboConfig(filePath: string): Promise<Record<string, unknown>> {
  const content = await readFile(filePath, 'utf-8')
  const stripped = filePath.endsWith('.jsonc') ? stripJsoncComments(content) : content
  return JSON.parse(stripped)
}

/** Add string values from named array properties of an object into a target set. */
export function addEnvVarsFromArrays(
  obj: Record<string, unknown>,
  keys: readonly string[],
  target: Set<string>
): void {
  for (const key of keys) {
    const arr = obj[key]
    if (Array.isArray(arr)) {
      for (const v of arr) {
        if (typeof v === 'string') target.add(v)
      }
    }
  }
}

/** Collect all env var names from a turbo config object. */
export function collectTurboEnvVars(config: Record<string, unknown>): Set<string> {
  const vars = new Set<string>()
  addEnvVarsFromArrays(config, ['globalEnv', 'globalPassThroughEnv'], vars)

  const tasks = config.tasks
  if (tasks && typeof tasks === 'object') {
    for (const task of Object.values(tasks as Record<string, Record<string, unknown>>)) {
      if (!task || typeof task !== 'object') continue
      addEnvVarsFromArrays(task, ['env', 'passThroughEnv'], vars)
    }
  }

  return vars
}

/** Check if a key matches any wildcard pattern (e.g. VITE_FOO matches VITE_*). */
export function matchesWildcard(key: string, patterns: Set<string>): boolean {
  for (const pattern of patterns) {
    if (!pattern.endsWith('*')) continue
    const prefix = pattern.slice(0, -1)
    if (key.startsWith(prefix)) return true
  }
  return false
}

/** Collect turbo env vars from all turbo.json files in a workspace directory. */
async function collectVarsFromWorkspaceDir(dir: string, target: Set<string>): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const turboPath = join(dir, entry.name, 'turbo.json')
    try {
      const config = await parseTurboConfig(turboPath)
      for (const v of collectTurboEnvVars(config)) {
        target.add(v)
      }
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        continue
      }
      console.warn(`WARN: Failed to parse ${turboPath}: ${err}`)
    }
  }
}

/** Gather all turbo env vars from root and app-level turbo configs. */
async function gatherAllTurboVars(): Promise<Set<string>> {
  const allTurboVars = new Set<string>()

  // Parse root turbo.jsonc
  const rootConfig = await parseTurboConfig(join(ROOT, 'turbo.jsonc'))
  for (const v of collectTurboEnvVars(rootConfig)) {
    allTurboVars.add(v)
  }

  // Parse workspace-level turbo.json files (apps/*, packages/*)
  await collectVarsFromWorkspaceDir(join(ROOT, 'apps'), allTurboVars)
  await collectVarsFromWorkspaceDir(join(ROOT, 'packages'), allTurboVars)

  return allTurboVars
}

/** Cross-validate schema keys against turbo config declarations. */
async function checkTurboDeclarations(allSchemaKeys: Set<string>): Promise<{ warnings: string[] }> {
  const warnings: string[] = []
  const allTurboVars = await gatherAllTurboVars()

  // Separate concrete names from wildcard patterns
  const wildcardPatterns = new Set<string>()
  const concreteVars = new Set<string>()
  for (const v of allTurboVars) {
    if (v.endsWith('*')) wildcardPatterns.add(v)
    else concreteVars.add(v)
  }

  // Check each schema key
  for (const key of allSchemaKeys) {
    if (TOOLING_ALLOWLIST.has(key)) continue
    if (concreteVars.has(key)) continue
    if (matchesWildcard(key, wildcardPatterns)) continue
    warnings.push(`${key} is in a schema but not declared in any turbo config (env/passThroughEnv)`)
  }

  return { warnings }
}

async function main() {
  console.log('Checking env schema sync with .env.example...\n')

  const { envSchema: apiEnvSchema } = await import('../apps/api/src/config/env.validation')
  const { envSchema: webServerEnvSchema } = await import('../apps/web/src/lib/env.server.schema')
  const { clientEnvSchema: webClientEnvSchema } = await import('../apps/web/src/lib/env.shared')

  const envExampleKeys = await parseEnvExample()

  const allSchemaKeys = new Set([
    ...schemaKeys(apiEnvSchema),
    ...schemaKeys(webServerEnvSchema),
    ...schemaKeys(webClientEnvSchema),
  ])

  let hasErrors = false

  // ERROR: schema key not documented in .env.example (and not allowlisted)
  for (const key of allSchemaKeys) {
    if (TOOLING_ALLOWLIST.has(key)) continue
    if (!envExampleKeys.has(key)) {
      console.error(`ERROR: ${key} is in a schema but missing from .env.example`)
      hasErrors = true
    }
  }

  // WARN: .env.example key not in any schema (and not allowlisted)
  for (const key of envExampleKeys) {
    if (TOOLING_ALLOWLIST.has(key)) continue
    if (!allSchemaKeys.has(key)) {
      console.warn(`WARN:  ${key} is in .env.example but not in any schema`)
    }
  }

  // Check vite.config.ts inline schema drift
  const viteDrift = await checkViteConfigDrift(schemaKeys(webClientEnvSchema))
  for (const error of viteDrift.errors) {
    console.error(`ERROR: ${error}`)
    hasErrors = true
  }

  // Check turbo config declarations
  // TODO: Once all existing turbo config gaps are resolved, promote these warnings
  // to errors (set hasErrors = true) so CI catches future env var drift.
  console.log('\nChecking turbo config declarations...\n')
  const turboResult = await checkTurboDeclarations(allSchemaKeys)
  for (const warning of turboResult.warnings) {
    console.warn(`WARN:  ${warning}`)
  }

  console.log()

  if (hasErrors) {
    console.error('Env sync check failed. Add missing keys to .env.example or the allowlist.')
    process.exit(1)
  }

  console.log('All env schemas are in sync with .env.example!')
  process.exit(0)
}

// Only run when executed directly, not when imported for testing
if (import.meta.main) {
  main().catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })
}
