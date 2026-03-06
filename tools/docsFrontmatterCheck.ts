/**
 * Docs Frontmatter Check — Fumadocs frontmatter validator
 *
 * Scans docs/**\/*.mdx and docs/**\/*.md files and verifies that each file
 * has a valid YAML frontmatter block with at minimum a `title` field, which
 * is required by fumadocs-mdx at build time.
 *
 * Exit codes:
 *   0 — all files have valid frontmatter
 *   2 — one or more files have missing or invalid frontmatter
 *
 * Usage:
 *   bun run tools/docsFrontmatterCheck.ts
 */

import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { Glob } from 'bun'
import { parse as parseYaml } from 'yaml'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Repository root — all paths are resolved relative to this. */
const ROOT = resolve(import.meta.dirname, '..')

/** Glob patterns for files to scan. */
const SCAN_PATTERNS = ['docs/**/*.mdx', 'docs/**/*.md']

/** Required frontmatter fields (fumadocs-mdx enforces `title`). */
const REQUIRED_FIELDS = ['title'] as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FrontmatterError {
  file: string
  reason: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collect all docs files matching the scan patterns.
 */
async function collectFiles(): Promise<string[]> {
  const files: string[] = []

  for (const pattern of SCAN_PATTERNS) {
    const glob = new Glob(pattern)
    for await (const match of glob.scan({ cwd: ROOT, absolute: false })) {
      files.push(match)
    }
  }

  return files.sort()
}

/**
 * Parse the YAML frontmatter block from a file's content.
 * Returns the parsed object, or null if no frontmatter block is found.
 */
export function parseFrontmatter(content: string): Record<string, unknown> | null {
  if (!content.startsWith('---')) return null

  const end = content.indexOf('\n---', 3)
  if (end === -1) return null

  const yaml = content.slice(3, end).trim()

  try {
    const parsed = parseYaml(yaml)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

/**
 * Validate a parsed frontmatter object against required fields.
 * Returns an array of error messages (empty = valid).
 */
export function validateFrontmatter(frontmatter: Record<string, unknown> | null): string[] {
  if (frontmatter === null) {
    return ['Missing frontmatter block (must start with ---)']
  }

  const errors: string[] = []

  for (const field of REQUIRED_FIELDS) {
    const value = frontmatter[field]
    if (value === undefined || value === null || value === '') {
      errors.push(`Missing required field: "${field}"`)
    } else if (typeof value !== 'string') {
      errors.push(`Field "${field}" must be a string, got ${typeof value}`)
    }
  }

  return errors
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Docs Frontmatter Check')
  console.log('======================\n')

  const files = await collectFiles()
  console.log(`Scanning ${files.length} files...\n`)

  const errors: FrontmatterError[] = []

  for (const file of files) {
    const fullPath = join(ROOT, file)
    const content = await readFile(fullPath, 'utf-8')
    const frontmatter = parseFrontmatter(content)
    const fieldErrors = validateFrontmatter(frontmatter)

    for (const reason of fieldErrors) {
      errors.push({ file, reason })
    }
  }

  if (errors.length === 0) {
    console.log(`All ${files.length} files have valid frontmatter.`)
    process.exit(0)
  }

  console.log('FRONTMATTER ERRORS')
  console.log('------------------\n')

  for (const { file, reason } of errors) {
    console.log(`  ${file}`)
    console.log(`    ${reason}\n`)
  }

  console.log(`${errors.length} error(s) found.`)
  process.exit(2)
}

// Guard: skip auto-execution when loaded as a module in tests
if (!process.env.VITEST) {
  main().catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })
}
