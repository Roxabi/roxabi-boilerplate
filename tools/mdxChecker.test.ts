import { execFile } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { checkMdxFile, scanMdxFiles } from '../tools/mdxChecker'

const execFileAsync = promisify(execFile)

const ROOT = resolve(import.meta.dirname, '..')
const SCRIPT_PATH = join(ROOT, 'tools', 'mdxChecker.ts')

async function runMdxChecker(repoRoot?: string) {
  const args = repoRoot ? ['run', SCRIPT_PATH, repoRoot] : ['run', SCRIPT_PATH]
  try {
    const { stdout, stderr } = await execFileAsync('bun', args, {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: 'test' },
      timeout: 60000,
    })
    return { exitCode: 0, stdout, stderr }
  } catch (error: unknown) {
    const err = error as { code?: number; stdout?: string; stderr?: string }
    return {
      exitCode: err.code ?? 1,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
    }
  }
}

// ─── Integration test ─────────────────────────────────────────────────────────

describe('mdxChecker integration', () => {
  it('should exit 0 on the actual repo (no issues in docs/)', async () => {
    // We run on the docs/ subdirectory only to avoid known broken links in
    // historical artifact files (analyses, specs, plans from past work).
    const result = await runMdxChecker(join(ROOT, 'docs'))

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('No issues found')
  })

  it('should print the file count summary', async () => {
    const result = await runMdxChecker(join(ROOT, 'docs'))

    expect(result.stdout).toMatch(/MDX Check — \d+ files scanned/)
  })
})

// ─── scanMdxFiles ─────────────────────────────────────────────────────────────

describe('scanMdxFiles', () => {
  it('should find .mdx files recursively and exclude node_modules', () => {
    const files = scanMdxFiles(join(ROOT, 'docs'))
    expect(files.length).toBeGreaterThan(0)
    expect(files.every((f) => f.endsWith('.mdx'))).toBe(true)
    expect(files.some((f) => f.includes('node_modules'))).toBe(false)
  })

  it('should return sorted paths', () => {
    const files = scanMdxFiles(join(ROOT, 'docs'))
    const sorted = [...files].sort()
    expect(files).toEqual(sorted)
  })

  it('should return empty array for a directory with no MDX files', () => {
    const files = scanMdxFiles(join(ROOT, 'reports'))
    expect(files).toEqual([])
  })
})

// ─── Frontmatter checks ───────────────────────────────────────────────────────

describe('checkMdxFile — missing-frontmatter', () => {
  it('should flag a file with no frontmatter', () => {
    const content = '# My Doc\n\nSome prose.\n'
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    const issue = issues.find((i) => i.rule === 'missing-frontmatter')
    expect(issue).toBeDefined()
    expect(issue?.line).toBe(1)
  })

  it('should not flag a file that starts with ---', () => {
    const content = '---\ntitle: Hello\n---\n\n# Body\n'
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    expect(issues.find((i) => i.rule === 'missing-frontmatter')).toBeUndefined()
  })
})

describe('checkMdxFile — missing-title', () => {
  it('should flag frontmatter without a title field', () => {
    const content = '---\ndescription: A doc\n---\n\n# Body\n'
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    const issue = issues.find((i) => i.rule === 'missing-title')
    expect(issue).toBeDefined()
  })

  it('should not flag frontmatter with a title field', () => {
    const content = '---\ntitle: My Doc\ndescription: A doc\n---\n\n# Body\n'
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    expect(issues.find((i) => i.rule === 'missing-title')).toBeUndefined()
  })

  it('should not report missing-title when there is no frontmatter at all', () => {
    const content = '# No frontmatter\n'
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    // missing-frontmatter should fire, but not missing-title
    expect(issues.find((i) => i.rule === 'missing-title')).toBeUndefined()
    expect(issues.find((i) => i.rule === 'missing-frontmatter')).toBeDefined()
  })
})

// ─── Unescaped JSX checks ─────────────────────────────────────────────────────

describe('checkMdxFile — unescaped-jsx', () => {
  it('should flag a bare {identifier} in prose', () => {
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      'Send confirmation to {email} when done.',
      '',
    ].join('\n')
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    const issue = issues.find((i) => i.rule === 'unescaped-jsx')
    expect(issue).toBeDefined()
    expect(issue?.line).toBe(5)
    expect(issue?.message).toContain('{email}')
  })

  it('should NOT flag {identifier} inside a fenced code block', () => {
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      '```bash',
      'git worktree add ../roxabi-{slug}',
      '```',
      '',
    ].join('\n')
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    expect(issues.find((i) => i.rule === 'unescaped-jsx')).toBeUndefined()
  })

  it('should NOT flag {identifier} inside inline code backticks', () => {
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      'Use the `{slug}` placeholder in your config.',
      '',
    ].join('\n')
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    expect(issues.find((i) => i.rule === 'unescaped-jsx')).toBeUndefined()
  })

  it('should NOT flag $-prefixed template literals in code blocks', () => {
    // dollar-brace pattern: ${name} inside a code block should not be flagged
    const dollarBrace = '$' + '{name}'
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      '```ts',
      'const msg = `Hello ' + dollarBrace + '`',
      '```',
      '',
    ].join('\n')
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    expect(issues.find((i) => i.rule === 'unescaped-jsx')).toBeUndefined()
  })

  it('should NOT flag \\{escaped\\} braces', () => {
    const content = ['---', 'title: Test', '---', '', 'Use \\{placeholder\\} syntax.', ''].join(
      '\n'
    )
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    expect(issues.find((i) => i.rule === 'unescaped-jsx')).toBeUndefined()
  })

  it('should NOT flag lines starting with const/let/function/return', () => {
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      'const foo = {bar}',
      'function render({name}) {}',
      '',
    ].join('\n')
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    expect(issues.find((i) => i.rule === 'unescaped-jsx')).toBeUndefined()
  })

  it('should NOT flag import/export lines', () => {
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      'import { Callout } from "@/components"',
      'export { thing }',
      '',
    ].join('\n')
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    expect(issues.find((i) => i.rule === 'unescaped-jsx')).toBeUndefined()
  })

  it('should NOT flag JSX component prop lines', () => {
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      '<Button onClick={handleClick}>',
      '  label={text}',
      '</Button>',
      '',
    ].join('\n')
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    expect(issues.find((i) => i.rule === 'unescaped-jsx')).toBeUndefined()
  })

  it('should flag multiple bare expressions on different lines', () => {
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      'Hello {name}, your email is {email}.',
      '',
    ].join('\n')
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    const jsxIssues = issues.filter((i) => i.rule === 'unescaped-jsx')
    expect(jsxIssues).toHaveLength(2)
  })

  it('should NOT flag {identifier} that contains dots or operators', () => {
    // {user.email} has a dot — not matched by bare pattern
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      'Showing {user.email} and {count + 1}.',
      '',
    ].join('\n')
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    expect(issues.find((i) => i.rule === 'unescaped-jsx')).toBeUndefined()
  })

  it('should NOT flag ~~~ fenced code blocks', () => {
    const content = ['---', 'title: Test', '---', '', '~~~yaml', 'color: {color}', '~~~', ''].join(
      '\n'
    )
    const issues = checkMdxFile('/repo/docs/test.mdx', content, '/repo')

    expect(issues.find((i) => i.rule === 'unescaped-jsx')).toBeUndefined()
  })
})

// ─── Broken image checks ──────────────────────────────────────────────────────
//
// The broken-image rule is scoped to docs/ files only (Fumadocs-compiled).
// Tests use a fake repo root so that the test file appears under docs/.

describe('checkMdxFile — broken-image', () => {
  // Fake repo root: TMP_DIR. Docs directory: TMP_DIR/docs.
  const TMP_ROOT = join(ROOT, '.tmp-mdx-checker-test')
  const TMP_DOCS = join(TMP_ROOT, 'docs')
  const TMP_FILE = join(TMP_DOCS, 'test.mdx')

  beforeAll(() => {
    mkdirSync(TMP_DOCS, { recursive: true })
    mkdirSync(join(TMP_DOCS, 'images'), { recursive: true })
    writeFileSync(join(TMP_DOCS, 'images', 'screenshot.png'), '')
  })

  afterAll(() => {
    rmSync(TMP_ROOT, { recursive: true, force: true })
  })

  it('should flag a markdown image with a non-existent relative path', () => {
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      '![Screenshot](./images/missing.png)',
      '',
    ].join('\n')
    const issues = checkMdxFile(TMP_FILE, content, TMP_ROOT)

    const issue = issues.find((i) => i.rule === 'broken-image')
    expect(issue).toBeDefined()
    expect(issue?.line).toBe(5)
    expect(issue?.message).toContain('./images/missing.png')
  })

  it('should NOT flag a markdown image that exists', () => {
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      '![Screenshot](./images/screenshot.png)',
      '',
    ].join('\n')
    const issues = checkMdxFile(TMP_FILE, content, TMP_ROOT)

    expect(issues.find((i) => i.rule === 'broken-image')).toBeUndefined()
  })

  it('should NOT flag an external image URL', () => {
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      '![Logo](https://example.com/logo.png)',
      '',
    ].join('\n')
    const issues = checkMdxFile(TMP_FILE, content, TMP_ROOT)

    expect(issues.find((i) => i.rule === 'broken-image')).toBeUndefined()
  })

  it('should NOT flag broken images inside code blocks', () => {
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      '```md',
      '![Screenshot](./images/missing.png)',
      '```',
      '',
    ].join('\n')
    const issues = checkMdxFile(TMP_FILE, content, TMP_ROOT)

    expect(issues.find((i) => i.rule === 'broken-image')).toBeUndefined()
  })
})

// ─── Broken link checks ───────────────────────────────────────────────────────
//
// The broken-link rule is scoped to docs/ files only (Fumadocs-compiled).
// Tests use a fake repo root so that the test file appears under docs/.

describe('checkMdxFile — broken-link', () => {
  // Fake repo root: TMP_ROOT. Docs directory: TMP_ROOT/docs.
  const TMP_ROOT = join(ROOT, '.tmp-mdx-checker-link-test')
  const TMP_DOCS = join(TMP_ROOT, 'docs')
  const TMP_FILE = join(TMP_DOCS, 'test.mdx')

  beforeAll(() => {
    mkdirSync(join(TMP_DOCS, 'sub'), { recursive: true })
    writeFileSync(join(TMP_DOCS, 'sub', 'existing.mdx'), '---\ntitle: Existing\n---\n')
  })

  afterAll(() => {
    rmSync(TMP_ROOT, { recursive: true, force: true })
  })

  it('should flag a relative link to a non-existent file', () => {
    const content = ['---', 'title: Test', '---', '', 'See [Guide](./sub/missing).', ''].join('\n')
    const issues = checkMdxFile(TMP_FILE, content, TMP_ROOT)

    const issue = issues.find((i) => i.rule === 'broken-link')
    expect(issue).toBeDefined()
    expect(issue?.line).toBe(5)
  })

  it('should NOT flag a relative link to an existing .mdx file (no extension in ref)', () => {
    const content = ['---', 'title: Test', '---', '', 'See [Guide](./sub/existing).', ''].join('\n')
    const issues = checkMdxFile(TMP_FILE, content, TMP_ROOT)

    expect(issues.find((i) => i.rule === 'broken-link')).toBeUndefined()
  })

  it('should NOT flag links with fragment-only anchors', () => {
    const content = ['---', 'title: Test', '---', '', 'See [Section](#my-section).', ''].join('\n')
    const issues = checkMdxFile(TMP_FILE, content, TMP_ROOT)

    expect(issues.find((i) => i.rule === 'broken-link')).toBeUndefined()
  })

  it('should NOT flag external URLs', () => {
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      'See [Docs](https://docs.example.com/guide).',
      '',
    ].join('\n')
    const issues = checkMdxFile(TMP_FILE, content, TMP_ROOT)

    expect(issues.find((i) => i.rule === 'broken-link')).toBeUndefined()
  })

  it('should NOT flag image links (!) as broken links', () => {
    const content = ['---', 'title: Test', '---', '', '![Screenshot](./sub/missing.png)', ''].join(
      '\n'
    )
    const issues = checkMdxFile(TMP_FILE, content, TMP_ROOT)

    // broken-image rule handles images, not broken-link
    expect(issues.find((i) => i.rule === 'broken-link')).toBeUndefined()
  })

  it('should NOT flag broken links inside code blocks', () => {
    const content = [
      '---',
      'title: Test',
      '---',
      '',
      '```md',
      'See [Guide](./sub/missing).',
      '```',
      '',
    ].join('\n')
    const issues = checkMdxFile(TMP_FILE, content, TMP_ROOT)

    expect(issues.find((i) => i.rule === 'broken-link')).toBeUndefined()
  })
})
