#!/usr/bin/env bun
import { join, relative } from 'node:path'

const WEB_SRC = join(import.meta.dir, '../../apps/web/src')
const API_SRC = join(import.meta.dir, '../../apps/api/src')

const violations: Array<{ file: string; line: number; message: string }> = []

async function scanDir(
  dir: string,
  pattern: string,
  forbiddenImport: string,
  message: string
): Promise<void> {
  const glob = new Bun.Glob(pattern)
  for await (const file of glob.scan({ cwd: dir, absolute: true })) {
    const content = await Bun.file(file).text()
    const lines = content.split('\n')
    const relPath = relative(dir, file)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (
        line.includes(`from '${forbiddenImport}'`) ||
        line.includes(`from "${forbiddenImport}"`)
      ) {
        violations.push({ file: relPath, line: i + 1, message })
      }
    }
  }
}

await scanDir(
  WEB_SRC,
  '**/*.{ts,tsx}',
  '@repo/types/api',
  `apps/web must not import from @repo/types/api`
)

await scanDir(API_SRC, '**/*.ts', '@repo/types/ui', `apps/api must not import from @repo/types/ui`)

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`✗ ${v.file}:${v.line} — ${v.message}`)
  }
  process.exit(1)
} else {
  console.log('✓ No @repo/types import boundary violations found')
  process.exit(0)
}
