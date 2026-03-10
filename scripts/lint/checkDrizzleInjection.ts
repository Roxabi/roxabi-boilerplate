#!/usr/bin/env bun
import { join, relative } from 'node:path'

const API_SRC = join(import.meta.dir, '../../apps/api/src')

const ALLOWED_PATTERNS: Array<RegExp> = [
  /\.repository\.ts$/,
  /^admin\//,
  /^rbac\/permission\.service\.ts$/,
  /^auth\/auth\.service\.ts$/,
  /^tenant\/tenant\.service\.ts$/,
  /^tenant\/tenant\.interceptor\.ts$/,
  /^purge\/purge\.service\.ts$/,
  /^gdpr\/gdpr\.service\.ts$/,
]

function isAllowed(relPath: string): boolean {
  return ALLOWED_PATTERNS.some((pattern) => pattern.test(relPath))
}

const glob = new Bun.Glob('**/*.ts')

const violations: Array<{ file: string; line: number }> = []

for await (const file of glob.scan({ cwd: API_SRC, absolute: true })) {
  const content = await Bun.file(file).text()
  const lines = content.split('\n')
  const relPath = relative(API_SRC, file)

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('@Inject(DRIZZLE)')) {
      if (!isAllowed(relPath)) {
        violations.push({ file: relPath, line: i + 1 })
      }
    }
  }
}

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`✗ ${v.file}:${v.line} — @Inject(DRIZZLE) not allowed here`)
  }
  process.exit(1)
} else {
  console.log('✓ No DRIZZLE injection violations found')
  process.exit(0)
}
