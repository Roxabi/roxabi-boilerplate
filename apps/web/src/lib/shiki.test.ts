import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// shiki/core mock
// createBundledHighlighter(config) → createHighlighter
// createHighlighter(opts)         → highlighter
// highlighter.loadLanguage / loadTheme / codeToHtml
// ---------------------------------------------------------------------------

const mockCodeToHtmlFn = vi.fn().mockReturnValue('<pre><code>mocked</code></pre>')
const mockLoadLanguage = vi.fn().mockResolvedValue(undefined)
const mockLoadTheme = vi.fn().mockResolvedValue(undefined)

const mockHighlighter = {
  loadLanguage: mockLoadLanguage,
  loadTheme: mockLoadTheme,
  codeToHtml: mockCodeToHtmlFn,
}

// createHighlighter is the function returned by createBundledHighlighter
const mockCreateHighlighter = vi.fn().mockResolvedValue(mockHighlighter)
// createBundledHighlighter returns mockCreateHighlighter (not a promise — it's sync/Promise<fn>)
const mockCreateBundledHighlighter = vi.fn().mockResolvedValue(mockCreateHighlighter)

vi.mock('shiki/core', () => ({
  createBundledHighlighter: mockCreateBundledHighlighter,
}))

vi.mock('shiki/engine/javascript', () => ({
  createJavaScriptRegexEngine: vi.fn().mockReturnValue({}),
}))

// All lang/theme vi.mock calls must be inline — vi.mock is hoisted and any
// variable reference at the call-site would be in the TDZ.
vi.mock('@shikijs/langs/typescript', () => ({ default: {} }))
vi.mock('@shikijs/langs/tsx', () => ({ default: {} }))
vi.mock('@shikijs/langs/javascript', () => ({ default: {} }))
vi.mock('@shikijs/langs/jsx', () => ({ default: {} }))
vi.mock('@shikijs/langs/bash', () => ({ default: {} }))
vi.mock('@shikijs/langs/shellscript', () => ({ default: {} }))
vi.mock('@shikijs/langs/json', () => ({ default: {} }))
vi.mock('@shikijs/langs/jsonc', () => ({ default: {} }))
vi.mock('@shikijs/langs/yaml', () => ({ default: {} }))
vi.mock('@shikijs/langs/sql', () => ({ default: {} }))
vi.mock('@shikijs/langs/toml', () => ({ default: {} }))
vi.mock('@shikijs/langs/lua', () => ({ default: {} }))
vi.mock('@shikijs/langs/markdown', () => ({ default: {} }))
vi.mock('@shikijs/langs/mdx', () => ({ default: {} }))
vi.mock('@shikijs/langs/css', () => ({ default: {} }))
vi.mock('@shikijs/langs/html', () => ({ default: {} }))
vi.mock('@shikijs/langs/xml', () => ({ default: {} }))
vi.mock('@shikijs/langs/regex', () => ({ default: {} }))
vi.mock('@shikijs/langs/diff', () => ({ default: {} }))
vi.mock('@shikijs/langs/docker', () => ({ default: {} }))
vi.mock('@shikijs/langs/dockerfile', () => ({ default: {} }))
vi.mock('@shikijs/langs/ini', () => ({ default: {} }))
vi.mock('@shikijs/themes/github-light', () => ({ default: {} }))
vi.mock('@shikijs/themes/github-dark', () => ({ default: {} }))

import type { BundledLang, BundledTheme } from './shiki'
import { codeToHtml } from './shiki'

describe('BundledLang type', () => {
  it('accepts valid language keys', () => {
    const lang: BundledLang = 'typescript'
    expect(lang).toBe('typescript')
  })

  it('accepts alias keys', () => {
    const lang: BundledLang = 'ts'
    expect(lang).toBe('ts')
  })
})

describe('BundledTheme type', () => {
  it('accepts github-light', () => {
    const theme: BundledTheme = 'github-light'
    expect(theme).toBe('github-light')
  })

  it('accepts github-dark', () => {
    const theme: BundledTheme = 'github-dark'
    expect(theme).toBe('github-dark')
  })
})

describe('codeToHtml', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateHighlighter.mockResolvedValue(mockHighlighter)
    mockCreateBundledHighlighter.mockResolvedValue(mockCreateHighlighter)
    mockCodeToHtmlFn.mockReturnValue('<pre><code>mocked</code></pre>')
    mockLoadLanguage.mockResolvedValue(undefined)
    mockLoadTheme.mockResolvedValue(undefined)
  })

  it('calls createBundledHighlighter from shiki/core', async () => {
    await codeToHtml('const x = 1', {
      lang: 'typescript',
      themes: { light: 'github-light', dark: 'github-dark' },
    })
    expect(mockCreateBundledHighlighter).toHaveBeenCalled()
  })

  it('calls the returned createHighlighter with empty langs and themes', async () => {
    await codeToHtml('hello', { lang: 'markdown', themes: { light: 'github-light' } })
    expect(mockCreateHighlighter).toHaveBeenCalledWith({ langs: [], themes: [] })
  })

  it('calls highlighter.loadLanguage with the provided lang', async () => {
    await codeToHtml('echo hello', { lang: 'bash', themes: { light: 'github-light' } })
    expect(mockLoadLanguage).toHaveBeenCalledWith('bash')
  })

  it('calls highlighter.loadTheme for each theme in options.themes', async () => {
    await codeToHtml('const y = 2', {
      lang: 'javascript',
      themes: { light: 'github-light', dark: 'github-dark' },
    })
    expect(mockLoadTheme).toHaveBeenCalledWith('github-light')
    expect(mockLoadTheme).toHaveBeenCalledWith('github-dark')
    expect(mockLoadTheme).toHaveBeenCalledTimes(2)
  })

  it('calls highlighter.loadTheme once when only one theme provided', async () => {
    await codeToHtml('{}', { lang: 'json', themes: { light: 'github-light' } })
    expect(mockLoadTheme).toHaveBeenCalledWith('github-light')
    expect(mockLoadTheme).toHaveBeenCalledTimes(1)
  })

  it('passes code, lang, themes, and defaultColor:false to highlighter.codeToHtml', async () => {
    const code = 'select * from users'
    await codeToHtml(code, {
      lang: 'sql',
      themes: { light: 'github-light' },
    })
    expect(mockCodeToHtmlFn).toHaveBeenCalledWith(code, {
      lang: 'sql',
      themes: { light: 'github-light' },
      defaultColor: false,
    })
  })

  it('returns the HTML string from highlighter.codeToHtml', async () => {
    mockCodeToHtmlFn.mockReturnValue('<pre><code>highlighted</code></pre>')
    const result = await codeToHtml('hello', {
      lang: 'markdown',
      themes: { light: 'github-light' },
    })
    expect(result).toBe('<pre><code>highlighted</code></pre>')
  })

  it('passes defaultColor:false regardless of themes provided', async () => {
    await codeToHtml('{}', {
      lang: 'json',
      themes: { light: 'github-light', dark: 'github-dark', dim: 'github-light' },
    })
    const callArgs = mockCodeToHtmlFn.mock.calls[0]
    expect(callArgs?.[1]).toMatchObject({ defaultColor: false })
  })
})
