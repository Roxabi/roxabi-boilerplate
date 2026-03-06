/**
 * Branch database lifecycle management.
 *
 * Subcommands:
 *   create [issue_number] [--force]  — Create branch DB, push schema, seed, update .env
 *   drop   [issue_number]            — Drop branch DB (refuses default DB)
 *   list                             — List branch DBs with worktree cross-reference
 *
 * Usage:
 *   tsx scripts/dbBranch.ts create          # auto-detect issue from branch name
 *   tsx scripts/dbBranch.ts create 150      # explicit issue number
 *   tsx scripts/dbBranch.ts create --force  # non-interactive (for /scaffold)
 *   tsx scripts/dbBranch.ts drop
 *   tsx scripts/dbBranch.ts list
 */

import * as path from 'node:path'
import {
  buildDatabaseUrl,
  CONTAINER_NAME,
  checkContainerLiveness,
  createDatabase,
  DB_BRANCH_PREFIX,
  databaseExists,
  dropDatabase,
  log,
  logError,
  POSTGRES_USER,
  prompt,
  runSafe,
  updateEnvFile,
} from './dbBranch.helpers.js'
import { runMigrations, runSeed } from './dbBranch.setup.js'
import { parseWorktreeBlock, redactUrl, type WorktreeInfo } from './dbBranch.utils.js'

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const subcommand = args[0]

if (!(subcommand && ['create', 'drop', 'list'].includes(subcommand))) {
  console.error('Usage: tsx scripts/dbBranch.ts <create|drop|list> [issue_number] [--force]')
  process.exit(1)
}

const forceFlag = args.includes('--force')

/** Extract a numeric argument from CLI args (skip flags and subcommand). */
function parseExplicitIssueNumber(): string | undefined {
  for (const arg of args.slice(1)) {
    if (arg.startsWith('--')) continue
    if (/^\d+$/.test(arg)) return arg
  }
  return
}

// ---------------------------------------------------------------------------
// Issue number extraction
// ---------------------------------------------------------------------------

/**
 * Extract issue number from explicit CLI argument or from the current git branch name.
 * Branch patterns: feat/42-slug, fix/15-login, hotfix/42-urgent
 */
function extractIssueNumber(): string {
  const explicit = parseExplicitIssueNumber()
  if (explicit) return explicit

  const branchResult = runSafe('git branch --show-current')
  if (branchResult.status !== 0) {
    logError('Failed to determine current git branch.')
    process.exit(1)
  }

  const branch = branchResult.stdout
  const match = branch.match(/(?:feat|fix|hotfix)\/(\d+)/)
  if (!match) {
    logError(
      `Cannot extract issue number from branch '${branch}'. ` +
        'Use an explicit issue number: tsx scripts/dbBranch.ts create <number>'
    )
    process.exit(1)
  }

  return match[1]
}

// ---------------------------------------------------------------------------
// Subcommand: create
// ---------------------------------------------------------------------------

async function handleCreate(): Promise<void> {
  const issueNumber = extractIssueNumber()
  const dbName = `${DB_BRANCH_PREFIX}_${issueNumber}`

  if (!new RegExp(`^${DB_BRANCH_PREFIX}_\\d+$`).test(dbName)) {
    logError(`Invalid database name: '${dbName}'`)
    process.exit(1)
  }

  log(`Creating branch database '${dbName}'...`)

  // Step 1: Check container liveness
  checkContainerLiveness()

  // Step 2: Check if database already exists
  if (databaseExists(dbName)) {
    if (forceFlag) {
      log(`Database '${dbName}' already exists. --force specified, dropping and recreating...`)
      dropDatabase(dbName)
    } else if (process.stdin.isTTY) {
      const answer = await prompt(
        `[db-branch] Database '${dbName}' already exists. Recreate? (y/N) `
      )
      if (answer === 'y' || answer === 'yes') {
        log(`Dropping existing database '${dbName}'...`)
        dropDatabase(dbName)
      } else {
        log('Skipping database creation.')
        return
      }
    } else {
      logError(`Database '${dbName}' already exists. Use --force to recreate or run interactively.`)
      process.exit(1)
    }
  }

  // Step 3: Create the database
  createDatabase(dbName)
  log(`Database '${dbName}' created.`)

  const databaseUrl = buildDatabaseUrl(dbName)

  // Steps 4-5: Push schema, stamp migrations, and seed, with cleanup on failure
  try {
    runMigrations(databaseUrl, dbName)
    runSeed(databaseUrl)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logError(`${message}`)
    log(`Cleaning up: dropping database '${dbName}'...`)
    dropDatabase(dbName)
    process.exit(1)
  }

  // Step 6: Update .env
  updateEnvFile(databaseUrl)

  log(`Branch database '${dbName}' is ready.`)
  log(`DATABASE_URL=${redactUrl(databaseUrl)}`)
}

// ---------------------------------------------------------------------------
// Subcommand: drop
// ---------------------------------------------------------------------------

function handleDrop(): void {
  const issueNumber = extractIssueNumber()
  const dbName = `${DB_BRANCH_PREFIX}_${issueNumber}`

  if (!new RegExp(`^${DB_BRANCH_PREFIX}_\\d+$`).test(dbName)) {
    logError(`Invalid database name: '${dbName}'`)
    process.exit(1)
  }

  checkContainerLiveness()

  log(`Dropping database '${dbName}'...`)
  dropDatabase(dbName)
  log(`Database '${dbName}' dropped.`)
}

// ---------------------------------------------------------------------------
// Subcommand: list
// ---------------------------------------------------------------------------

function parseWorktrees(): WorktreeInfo[] {
  const result = runSafe('git worktree list --porcelain')
  if (result.status !== 0) return []

  return result.stdout
    .split('\n\n')
    .map(parseWorktreeBlock)
    .filter((wt): wt is WorktreeInfo => wt !== null)
}

function handleList(): void {
  checkContainerLiveness()

  // Query branch databases
  const dbResult = runSafe(
    `docker exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -tc "SELECT datname FROM pg_database WHERE datname ~ '^${DB_BRANCH_PREFIX}_[0-9]+$'"`
  )
  if (dbResult.status !== 0) {
    logError(`Failed to query databases: ${dbResult.stderr}`)
    process.exit(1)
  }

  const databases = dbResult.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (databases.length === 0) {
    log('No branch databases found.')
    return
  }

  // Get active worktrees
  const worktrees = parseWorktrees()

  // Build a map: issue number -> worktree info
  const worktreeByIssue = new Map<string, WorktreeInfo>()
  for (const wt of worktrees) {
    if (wt.issueNumber) {
      worktreeByIssue.set(wt.issueNumber, wt)
    }
  }

  // Determine column widths
  const header = { db: 'Database', wt: 'Worktree', branch: 'Branch', status: 'Status' }
  const rows: { db: string; wt: string; branch: string; status: string }[] = []

  for (const db of databases) {
    const issueMatch = db.match(new RegExp(`^${DB_BRANCH_PREFIX}_(\\d+)$`))
    const issueNumber = issueMatch ? issueMatch[1] : null
    const wt = issueNumber ? worktreeByIssue.get(issueNumber) : undefined

    if (wt) {
      // Make path relative for readability
      const cwd = process.cwd()
      const relPath = path.relative(cwd, wt.path) || wt.path
      rows.push({
        db,
        wt: relPath,
        branch: wt.branch,
        status: '\u2713 Active',
      })
    } else {
      rows.push({
        db,
        wt: '\u2014',
        branch: '\u2014',
        status: '\u26A0 Orphan',
      })
    }
  }

  // Calculate column widths
  const colDb = Math.max(header.db.length, ...rows.map((r) => r.db.length))
  const colWt = Math.max(header.wt.length, ...rows.map((r) => r.wt.length))
  const colBranch = Math.max(header.branch.length, ...rows.map((r) => r.branch.length))
  const colStatus = Math.max(header.status.length, ...rows.map((r) => r.status.length))

  const pad = (s: string, len: number) => s.padEnd(len)
  const sep = '\u2502'

  // Print table
  console.log(
    `${pad(header.db, colDb)} ${sep} ${pad(header.wt, colWt)} ${sep} ${pad(header.branch, colBranch)} ${sep} ${header.status}`
  )
  console.log(
    `${'\u2500'.repeat(colDb + 1)}${'\u253C'}${'\u2500'.repeat(colWt + 2)}${'\u253C'}${'\u2500'.repeat(colBranch + 2)}${'\u253C'}${'\u2500'.repeat(colStatus + 1)}`
  )
  for (const row of rows) {
    console.log(
      `${pad(row.db, colDb)} ${sep} ${pad(row.wt, colWt)} ${sep} ${pad(row.branch, colBranch)} ${sep} ${row.status}`
    )
  }

  log(`Found ${databases.length} branch database(s).`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  switch (subcommand) {
    case 'create':
      await handleCreate()
      break
    case 'drop':
      handleDrop()
      break
    case 'list':
      handleList()
      break
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  logError(message)
  process.exit(1)
})
