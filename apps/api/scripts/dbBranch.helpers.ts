import { execSync, spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline'
import { buildDatabaseUrl as buildDatabaseUrlUtil, redactUrl } from './dbBranch.utils.js'

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

export const POSTGRES_USER = process.env.POSTGRES_USER ?? 'roxabi'
export const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD ?? 'roxabi'
export const CONTAINER_NAME = process.env.POSTGRES_CONTAINER ?? 'roxabi-postgres'
export const DB_BRANCH_PREFIX = process.env.DB_BRANCH_PREFIX ?? process.env.POSTGRES_DB ?? 'roxabi'

// Validate credentials to prevent shell injection in docker exec commands
const SAFE_CREDENTIAL_PATTERN = /^[a-zA-Z0-9_-]+$/
if (!SAFE_CREDENTIAL_PATTERN.test(POSTGRES_USER)) {
  console.error(
    '[db-branch] ERROR: POSTGRES_USER contains invalid characters (allowed: a-zA-Z0-9_-)'
  )
  process.exit(1)
}
if (!SAFE_CREDENTIAL_PATTERN.test(POSTGRES_PASSWORD)) {
  console.error(
    '[db-branch] ERROR: POSTGRES_PASSWORD contains invalid characters (allowed: a-zA-Z0-9_-)'
  )
  process.exit(1)
}
if (!SAFE_CREDENTIAL_PATTERN.test(DB_BRANCH_PREFIX)) {
  console.error(
    '[db-branch] ERROR: DB_BRANCH_PREFIX contains invalid characters (allowed: a-zA-Z0-9_-)'
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

export function log(message: string): void {
  console.log(`[db-branch] ${message}`)
}

export function logError(message: string): void {
  console.error(`[db-branch] ERROR: ${message}`)
}

// ---------------------------------------------------------------------------
// Shell execution
// ---------------------------------------------------------------------------

/** Run a command, returning { status, stdout, stderr }. Never throws. */
export function runSafe(cmd: string): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    return { status: 0, stdout, stderr: '' }
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string }
    return {
      status: e.status ?? 1,
      stdout: (e.stdout ?? '').toString().trim(),
      stderr: (e.stderr ?? '').toString().trim(),
    }
  }
}

/** Run SQL against a database in the container via piped stdin. */
export function runSql(
  dbName: string,
  sql: string
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(
    'docker',
    ['exec', '-i', CONTAINER_NAME, 'psql', '-U', POSTGRES_USER, '-d', dbName],
    {
      input: sql,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  )
  return {
    status: result.status ?? 1,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  }
}

// ---------------------------------------------------------------------------
// Filesystem & path helpers
// ---------------------------------------------------------------------------

/**
 * Find the worktree root by walking up from apps/api/ (the script's working directory)
 * looking for the .env file.
 */
export function findWorktreeRoot(): string {
  // Start from the directory containing this script, then walk up
  let dir = process.cwd()
  const root = path.parse(dir).root

  while (dir !== root) {
    // Check for .git file or directory (indicates repo/worktree root)
    const gitPath = path.join(dir, '.git')
    if (fs.existsSync(gitPath)) {
      return dir
    }
    dir = path.dirname(dir)
  }

  logError('Could not determine worktree root.')
  process.exit(1)
}

/**
 * Resolve the apps/api directory for running bun scripts.
 * The script may already be running from apps/api/ or from the worktree root.
 */
export function resolveApiDir(): string {
  const cwd = process.cwd()
  // If we are already in apps/api
  if (path.basename(cwd) === 'api' && path.basename(path.dirname(cwd)) === 'apps') {
    return cwd
  }
  // Otherwise, assume worktree root
  const apiDir = path.join(cwd, 'apps', 'api')
  if (fs.existsSync(apiDir)) {
    return apiDir
  }
  // Walk up to find worktree root, then descend
  const root = findWorktreeRoot()
  const fromRoot = path.join(root, 'apps', 'api')
  if (fs.existsSync(fromRoot)) {
    return fromRoot
  }
  logError('Cannot locate apps/api/ directory.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Database operations
// ---------------------------------------------------------------------------

/** Check that the Postgres container is alive and accepting connections. */
export function checkContainerLiveness(): void {
  const result = runSafe(`docker exec ${CONTAINER_NAME} pg_isready -U ${POSTGRES_USER}`)
  if (result.status !== 0) {
    logError(
      `Postgres container is not running. Run 'bun run db:up' from the project root first.\n  ${result.stderr}`
    )
    process.exit(1)
  }
}

/** Check if a database exists in the container. */
export function databaseExists(dbName: string): boolean {
  const result = runSafe(
    `docker exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -tc "SELECT 1 FROM pg_database WHERE datname = '${dbName}'"`
  )
  return result.status === 0 && result.stdout.trim() === '1'
}

/** Drop a database inside the container. */
export function dropDatabase(dbName: string): void {
  const result = runSafe(
    `docker exec ${CONTAINER_NAME} dropdb -U ${POSTGRES_USER} --if-exists ${dbName}`
  )
  if (result.status !== 0) {
    logError(`Failed to drop database '${dbName}': ${result.stderr}`)
    process.exit(1)
  }
}

/** Create a database inside the container. */
export function createDatabase(dbName: string): void {
  const result = runSafe(`docker exec ${CONTAINER_NAME} createdb -U ${POSTGRES_USER} ${dbName}`)
  if (result.status !== 0) {
    logError(`Failed to create database '${dbName}': ${result.stderr}`)
    process.exit(1)
  }
}

/** Build the DATABASE_URL for a branch database. */
export function buildDatabaseUrl(dbName: string): string {
  return buildDatabaseUrlUtil(dbName, POSTGRES_USER, POSTGRES_PASSWORD)
}

/** Build the DATABASE_APP_URL for a branch database using the roxabi_app user. */
export function buildAppDatabaseUrl(dbName: string): string {
  const appUser = process.env.POSTGRES_APP_USER ?? 'roxabi_app'
  const appPassword = process.env.POSTGRES_APP_PASSWORD ?? 'roxabi_app'
  return buildDatabaseUrlUtil(dbName, appUser, appPassword)
}

/** Update the .env file at the worktree root to use the branch DATABASE_URL and DATABASE_APP_URL. */
export function updateEnvFile(databaseUrl: string): void {
  const root = findWorktreeRoot()
  const envPath = path.join(root, '.env')

  if (!fs.existsSync(envPath)) {
    logError(`No .env file found at ${envPath}. Run 'cp .env.example .env' first.`)
    process.exit(1)
  }

  const content = fs.readFileSync(envPath, 'utf-8')
  const lines = content.split('\n')
  let replacedUrl = false
  let replacedAppUrl = false

  // Derive the app URL from the owner URL by substituting the user/password
  const dbName = databaseUrl.split('/').pop() ?? ''
  const appUrl = buildAppDatabaseUrl(dbName)

  const updatedLines = lines.map((line) => {
    if (/^DATABASE_URL\s*=/.test(line)) {
      replacedUrl = true
      return `DATABASE_URL=${databaseUrl}`
    }
    if (/^DATABASE_APP_URL\s*=/.test(line)) {
      replacedAppUrl = true
      return `DATABASE_APP_URL=${appUrl}`
    }
    return line
  })

  if (!replacedUrl) {
    updatedLines.push(`DATABASE_URL=${databaseUrl}`)
  }
  if (!replacedAppUrl) {
    updatedLines.push(`DATABASE_APP_URL=${appUrl}`)
  }

  fs.writeFileSync(envPath, updatedLines.join('\n'), 'utf-8')
  log(`Updated ${envPath} with DATABASE_URL=${redactUrl(databaseUrl)}`)
  log(`Updated ${envPath} with DATABASE_APP_URL=${redactUrl(appUrl)}`)
}

// ---------------------------------------------------------------------------
// Interactive prompt
// ---------------------------------------------------------------------------

/** Prompt the user interactively. Returns the answer string. */
export function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}
