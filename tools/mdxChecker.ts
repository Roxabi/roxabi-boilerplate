/**
 * MDX Checker — Frontmatter, JSX Expression, and Reference Integrity
 *
 * Scans all .mdx files in the repo, checks for common authoring mistakes that
 * cause Fumadocs (or any MDX-as-JSX compiler) build failures:
 *
 *   Applied to ALL .mdx files:
 *   - Missing frontmatter block (--- on line 1)
 *   - Missing title field in frontmatter
 *
 *   Applied only to docs/ files (compiled by Fumadocs):
 *   - Unescaped bare JSX expressions ({identifier}) outside code blocks
 *   - Broken relative image references
 *   - Broken relative link references
 *
 * The JSX and reference checks are scoped to the Fumadocs source directory
 * (docs/) because only those files are compiled as JSX. Artifact files
 * (artifacts/) use {placeholder} syntax as a documentation convention and
 * contain cross-references that may point to files from past work.
 *
 * Usage: bun run tools/mdxChecker.ts [repo-root]
 *
 * Zero external dependencies — uses only Node.js fs/path.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve } from 'node:path'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MdxIssue {
  file: string
  line: number
  rule: string
  message: string
}

// ─── File Scanning ───────────────────────────────────────────────────────────

/**
 * Recursively find all .mdx files under repoRoot, excluding node_modules/.
 */
export function scanMdxFiles(repoRoot: string): string[] {
  const results: string[] = []

  function walk(dir: string): void {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.git') continue
      const full = join(dir, entry)
      let stat: ReturnType<typeof statSync> | undefined
      try {
        stat = statSync(full)
      } catch {
        continue
      }
      if (!stat) continue
      if (stat.isDirectory()) {
        walk(full)
      } else if (stat.isFile() && extname(full) === '.mdx') {
        results.push(full)
      }
    }
  }

  walk(repoRoot)
  return results.sort()
}

// ─── Code Block Tracking ─────────────────────────────────────────────────────

/**
 * Returns a set of 1-based line numbers that are inside fenced code blocks.
 * Fence delimiters (``` and ~~~) are themselves included in the skip set.
 *
 * Handles nested fences: when a fence line with a language specifier appears
 * inside an already-open fence of the same character, it is treated as an inner
 * nested block (depth incremented). A bare closing fence (no language tag)
 * decrements the depth. This correctly handles patterns like:
 *
 *   ```yaml
 *   ...
 *      ```bash
 *      inner content
 *      ```
 *   ...
 *   ```
 */
function buildSkipSet(lines: string[]): Set<number> {
  const skip = new Set<number>()
  let depth = 0
  let fenceChar = ''

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1
    const trimmed = lines[i].trimStart()

    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/)
    if (fenceMatch) {
      const ch = fenceMatch[1][0]
      const fenceStr = fenceMatch[1]
      // A fence line with a language specifier or extra content after the ticks
      const hasExtra = trimmed.length > fenceStr.length

      if (depth === 0) {
        // Open a new fence block
        depth = 1
        fenceChar = ch
        skip.add(lineNo)
      } else if (ch === fenceChar) {
        if (hasExtra) {
          // Inner fence open (e.g. ```bash inside ```yaml)
          depth++
          skip.add(lineNo)
        } else {
          // Closing fence
          depth--
          skip.add(lineNo)
          if (depth === 0) fenceChar = ''
        }
      } else {
        // Different fence character — mark as skip (rare but valid)
        skip.add(lineNo)
      }
      continue
    }

    if (depth > 0) {
      skip.add(lineNo)
    }
  }

  return skip
}

/**
 * Strip inline code spans (backtick-delimited) from a line for prose analysis.
 * Replaces matched spans with spaces to preserve string length offsets.
 */
function stripInlineCode(line: string): string {
  return line.replace(/``[^`]*``|`[^`]*`/g, (m) => ' '.repeat(m.length))
}

// ─── Rule Implementations ────────────────────────────────────────────────────

/**
 * Rule: missing-frontmatter
 * Every MDX file should start with a YAML frontmatter block (--- on line 1).
 * Applied to all .mdx files.
 */
function checkFrontmatter(lines: string[], filePath: string): MdxIssue[] {
  if (lines[0]?.trimEnd() !== '---') {
    return [
      {
        file: filePath,
        line: 1,
        rule: 'missing-frontmatter',
        message: 'MDX file does not start with a YAML frontmatter block (---)',
      },
    ]
  }
  return []
}

/**
 * Rule: missing-title
 * Frontmatter exists but has no `title:` field.
 * Applied to all .mdx files.
 */
function checkFrontmatterTitle(lines: string[], filePath: string): MdxIssue[] {
  if (lines[0]?.trimEnd() !== '---') return []

  let closeIdx = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trimEnd() === '---') {
      closeIdx = i
      break
    }
  }

  if (closeIdx === -1) return []

  const frontmatterLines = lines.slice(1, closeIdx)
  const hasTitle = frontmatterLines.some((l) => /^title\s*:/.test(l))

  if (!hasTitle) {
    return [
      {
        file: filePath,
        line: 1,
        rule: 'missing-title',
        message: 'Frontmatter exists but has no `title:` field',
      },
    ]
  }

  return []
}

/**
 * Rule: unescaped-jsx
 * Detects bare {identifier} expressions in prose that MDX would try to
 * evaluate as JSX. Only flags single-word identifiers like {email} or {name}.
 *
 * Applied ONLY to docs/ files (compiled by Fumadocs).
 *
 * Skips:
 *   - Content inside fenced code blocks (tracked via skipLines)
 *   - Content inside inline code backticks (stripped before checking)
 *   - Template literals: ${...}
 *   - Escaped braces: \{
 *   - Import / export statement lines
 *   - Lines that look like code (const, let, function, return, if (, etc.)
 *   - JSX component prop lines (indented `prop={val}` or `<Component` lines)
 */
function checkUnescapedJsx(lines: string[], skipLines: Set<number>, filePath: string): MdxIssue[] {
  const issues: MdxIssue[] = []
  const bareExprPattern = /(?<!\$)(?<!\\)\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g

  // Lines that are clearly code context, not prose
  const codeLinePattern =
    /^\s*(import\s|export\s|const\s|let\s|var\s|function\s|return\s|if\s*\(|else[{\s]|for\s*\(|while\s*\(|switch\s*\(|\/\/|\/\*|\*)/

  // JSX attribute lines: indented `prop={val}` or opening `<ComponentName`
  const jsxPropPattern = /^\s+[\w-]+=\{|^\s*<[A-Z]/

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1
    if (skipLines.has(lineNo)) continue

    const raw = lines[i]

    if (codeLinePattern.test(raw)) continue
    if (jsxPropPattern.test(raw)) continue

    // Remove inline code before scanning for bare expressions
    const stripped = stripInlineCode(raw)

    bareExprPattern.lastIndex = 0
    for (
      let match = bareExprPattern.exec(stripped);
      match !== null;
      match = bareExprPattern.exec(stripped)
    ) {
      const identifier = match[1]
      issues.push({
        file: filePath,
        line: lineNo,
        rule: 'unescaped-jsx',
        message: `Bare JSX expression {${identifier}} outside code block — escape as \\{${identifier}\\} or wrap in backticks`,
      })
    }
  }

  return issues
}

/**
 * Rule: broken-image
 * Checks `![alt](./relative/path)` and `<img src="./relative/path">` references.
 * Only checks paths starting with ./ or ../ (relative to the MDX file directory).
 * Applied ONLY to docs/ files (compiled by Fumadocs).
 */
function checkBrokenImages(lines: string[], skipLines: Set<number>, filePath: string): MdxIssue[] {
  const issues: MdxIssue[] = []
  const fileDir = dirname(filePath)

  const mdImagePattern = /!\[.*?\]\((\.\.?\/[^)\s#?]+)/g
  const htmlImagePattern = /<img\s[^>]*src=["'](\.\.?\/[^"'#?]+)["']/g

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1
    if (skipLines.has(lineNo)) continue
    const line = lines[i]

    for (const pattern of [mdImagePattern, htmlImagePattern]) {
      pattern.lastIndex = 0
      for (let match = pattern.exec(line); match !== null; match = pattern.exec(line)) {
        const refPath = match[1]
        const absolutePath = normalize(join(fileDir, refPath))
        if (!existsSync(absolutePath)) {
          issues.push({
            file: filePath,
            line: lineNo,
            rule: 'broken-image',
            message: `Broken relative image reference: ${refPath}`,
          })
        }
      }
    }
  }

  return issues
}

/**
 * Rule: broken-link
 * Checks `[text](./relative/path)` and `[text](../relative/path)` references.
 * Skips fragment-only links (#section), external URLs, and image links (!).
 * Tries the literal path, path + .mdx, and path + .md.
 * Applied ONLY to docs/ files (compiled by Fumadocs).
 */
function checkBrokenLinks(lines: string[], skipLines: Set<number>, filePath: string): MdxIssue[] {
  const issues: MdxIssue[] = []
  const fileDir = dirname(filePath)

  // Non-image markdown link with a relative path
  const mdLinkPattern = /(?<!!)\[.*?\]\((\.\.?\/[^)\s#?]+)/g

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1
    if (skipLines.has(lineNo)) continue
    const line = lines[i]

    mdLinkPattern.lastIndex = 0
    for (let match = mdLinkPattern.exec(line); match !== null; match = mdLinkPattern.exec(line)) {
      const refPath = match[1]
      const cleanRef = refPath.split('?')[0].split('#')[0]
      if (!cleanRef) continue

      const absolutePath = normalize(join(fileDir, cleanRef))

      const exists =
        existsSync(absolutePath) ||
        existsSync(absolutePath + '.mdx') ||
        existsSync(absolutePath + '.md')

      if (!exists) {
        issues.push({
          file: filePath,
          line: lineNo,
          rule: 'broken-link',
          message: `Broken relative link reference: ${refPath}`,
        })
      }
    }
  }

  return issues
}

// ─── Main Checker ─────────────────────────────────────────────────────────────

/**
 * Run all checks on a single MDX file.
 *
 * Rules that require JSX compilation context (unescaped-jsx, broken-link,
 * broken-image) are only applied to files under the docs/ directory, since
 * that is the only directory compiled by Fumadocs.
 *
 * @param filePath  Absolute path to the file (used for resolving relative refs)
 * @param content   Raw file content string
 * @param repoRoot  Absolute path to the repo root
 */
export function checkMdxFile(filePath: string, content: string, repoRoot: string): MdxIssue[] {
  const lines = content.split('\n')
  const skipLines = buildSkipSet(lines)
  const issues: MdxIssue[] = []

  // Rules applied to all files
  issues.push(...checkFrontmatter(lines, filePath))
  issues.push(...checkFrontmatterTitle(lines, filePath))

  // Rules applied only to docs/ (JSX-compiled) files
  const docsDir = join(repoRoot, 'docs')
  if (filePath.startsWith(docsDir + '/') || filePath.startsWith(docsDir + '\\')) {
    issues.push(...checkUnescapedJsx(lines, skipLines, filePath))
    issues.push(...checkBrokenImages(lines, skipLines, filePath))
    issues.push(...checkBrokenLinks(lines, skipLines, filePath))
  }

  return issues
}

// ─── CLI Output ──────────────────────────────────────────────────────────────

function printIssues(issuesByFile: Map<string, MdxIssue[]>, repoRoot: string): void {
  for (const [file, issues] of issuesByFile) {
    const relFile = file.startsWith(repoRoot + '/') ? file.slice(repoRoot.length + 1) : file
    console.log(`\n${relFile}`)
    for (const issue of issues) {
      console.log(`  ${relFile}:${issue.line}  [${issue.rule}]  ${issue.message}`)
    }
  }
}

function printSummary(totalFiles: number, totalIssues: number): void {
  console.log(`\nMDX Check — ${totalFiles} files scanned`)
  if (totalIssues === 0) {
    console.log('\u2705 No issues found')
  } else {
    const s = totalIssues === 1 ? '' : 's'
    console.log(`\u274c ${totalIssues} issue${s} found`)
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function main(): void {
  const repoRoot = process.argv[2]
    ? resolve(process.argv[2])
    : resolve(import.meta.dirname ?? '.', '..')

  const files = scanMdxFiles(repoRoot)
  const issuesByFile = new Map<string, MdxIssue[]>()
  let totalIssues = 0

  for (const file of files) {
    let content: string
    try {
      content = readFileSync(file, 'utf-8')
    } catch {
      continue
    }
    const issues = checkMdxFile(file, content, repoRoot)
    if (issues.length > 0) {
      issuesByFile.set(file, issues)
      totalIssues += issues.length
    }
  }

  printIssues(issuesByFile, repoRoot)
  printSummary(files.length, totalIssues)

  process.exit(totalIssues > 0 ? 1 : 0)
}

// Only run when executed directly, not when imported for testing
if (import.meta.main) {
  main()
}
