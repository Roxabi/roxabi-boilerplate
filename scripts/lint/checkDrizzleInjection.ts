#!/usr/bin/env bun
import { join, relative } from 'node:path'

const API_SRC = join(import.meta.dir, '../../apps/api/src')

// Repository files are the data access layer — DRIZZLE injection is expected
const REPOSITORY_PATTERN = /\.repository\.ts$/

// Non-repository files that are allowed to inject DRIZZLE but MUST have // RLS-BYPASS: annotation
const BYPASS_PATTERNS: Array<RegExp> = [
  /^admin\//,
  /^rbac\/permission\.service\.ts$/,
  /^auth\/auth\.service\.ts$/,
  /^tenant\/tenant\.service\.ts$/,
  /^tenant\/tenant\.interceptor\.ts$/,
  /^purge\/purge\.service\.ts$/,
  /^gdpr\/gdpr\.service\.ts$/,
]

function isRepository(relPath: string): boolean {
  return REPOSITORY_PATTERN.test(relPath)
}

function isBypassAllowed(relPath: string): boolean {
  return BYPASS_PATTERNS.some((pattern) => pattern.test(relPath))
}

const glob = new Bun.Glob('**/*.ts')

const violations: Array<{ file: string; line: number; message: string }> = []

for await (const file of glob.scan({ cwd: API_SRC, absolute: true })) {
  const relPath = relative(API_SRC, file)

  // Skip test files — they legitimately use @Inject(DRIZZLE) in fixtures
  if (relPath.endsWith('.test.ts')) continue

  const content = await Bun.file(file).text()
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('@Inject(DRIZZLE)')) {
      if (isRepository(relPath)) {
        // Repositories are the data access layer — always allowed
      } else if (isBypassAllowed(relPath)) {
        // Allowed bypass — but must have RLS-BYPASS annotation
        if (!lines[i].includes('// RLS-BYPASS:')) {
          violations.push({
            file: relPath,
            line: i + 1,
            message: '@Inject(DRIZZLE) in allowed file is missing // RLS-BYPASS: annotation',
          })
        }
      } else {
        violations.push({
          file: relPath,
          line: i + 1,
          message: '@Inject(DRIZZLE) not allowed here',
        })
      }
    }
  }
}

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`✗ ${v.file}:${v.line} — ${v.message}`)
  }
  process.exit(1)
} else {
  console.log('✓ No DRIZZLE injection violations found')
  process.exit(0)
}
