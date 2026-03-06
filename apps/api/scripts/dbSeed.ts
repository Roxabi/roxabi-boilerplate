/**
 * Seed script — inserts dev essentials into a fresh database.
 *
 * Designed for fresh databases only (not idempotent).
 * For re-seeding, drop and recreate the database (db:branch:create --force).
 *
 * Presets:
 *   minimal — 3 users, 2 orgs, basic RBAC
 *   full (default) — 12 users, 4 orgs, invitations, cross-org members
 *
 * Usage:
 *   DATABASE_URL=postgresql://... tsx scripts/dbSeed.ts
 *   DATABASE_URL=postgresql://... tsx scripts/dbSeed.ts --preset=full
 *   bun run db:seed  (reads DATABASE_URL from .env)
 */

import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../src/database/schema/index.js'
import { type Preset, runFixtures } from './fixtures/index.js'
import { assertNotProduction, requireDatabaseUrl } from './guards.js'

export const VALID_PRESETS: Preset[] = ['minimal', 'full']

export function parsePreset(argv: string[] = process.argv): Preset {
  const presetArg = argv.find((a) => a.startsWith('--preset='))
  const preset = presetArg ? presetArg.split('=')[1] : 'full'
  if (!VALID_PRESETS.includes(preset as Preset)) {
    console.error(`db-seed: unknown preset "${preset}". Available: ${VALID_PRESETS.join(', ')}`)
    process.exit(1)
  }
  return preset as Preset
}

async function seed() {
  assertNotProduction('db-seed')
  const databaseUrl = requireDatabaseUrl('db-seed')

  const preset = parsePreset()
  console.log(`db-seed: using preset "${preset}"`)

  const client = postgres(databaseUrl, { max: 1 })
  const db = drizzle(client, { schema })

  try {
    await runFixtures(db, preset)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const code =
      (error as { code?: string }).code ?? (error as { cause?: { code?: string } }).cause?.code
    if (code === '23505' || message.includes('duplicate key')) {
      console.error(
        "db-seed: database already contains data. Run 'bun run db:reset' first, then re-run 'bun run db:seed'."
      )
    } else {
      console.error('db-seed: failed to seed database:', error)
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed()
}
