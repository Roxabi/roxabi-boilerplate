import type { createBundledHighlighter as CreateBundledHighlighterFn } from 'shiki/core'

/**
 * Custom Shiki config that uses a mini bundled highlighter instead of the full
 * `shiki` package. Importing `shiki` directly pulls 200+ grammars and 60+
 * themes (~9 MB) into the Nitro SSR bundle, causing OOM on CI runners with
 * limited memory.
 *
 * Using `createBundledHighlighter` from `shiki/core` with only our needed
 * languages gives us lazy grammar dependency resolution (unlike
 * `createHighlighterCore` which crashes on cross-grammar references) while
 * keeping the bundle small.
 */

const bundledLangs = {
  typescript: () => import('@shikijs/langs/typescript'),
  ts: () => import('@shikijs/langs/typescript'),
  tsx: () => import('@shikijs/langs/tsx'),
  javascript: () => import('@shikijs/langs/javascript'),
  js: () => import('@shikijs/langs/javascript'),
  jsx: () => import('@shikijs/langs/jsx'),
  bash: () => import('@shikijs/langs/bash'),
  sh: () => import('@shikijs/langs/bash'),
  shell: () => import('@shikijs/langs/shellscript'),
  shellscript: () => import('@shikijs/langs/shellscript'),
  json: () => import('@shikijs/langs/json'),
  jsonc: () => import('@shikijs/langs/jsonc'),
  yaml: () => import('@shikijs/langs/yaml'),
  yml: () => import('@shikijs/langs/yaml'),
  sql: () => import('@shikijs/langs/sql'),
  toml: () => import('@shikijs/langs/toml'),
  lua: () => import('@shikijs/langs/lua'),
  markdown: () => import('@shikijs/langs/markdown'),
  md: () => import('@shikijs/langs/markdown'),
  mdx: () => import('@shikijs/langs/mdx'),
  css: () => import('@shikijs/langs/css'),
  html: () => import('@shikijs/langs/html'),
  xml: () => import('@shikijs/langs/xml'),
  regex: () => import('@shikijs/langs/regex'),
  diff: () => import('@shikijs/langs/diff'),
  docker: () => import('@shikijs/langs/docker'),
  dockerfile: () => import('@shikijs/langs/dockerfile'),
  ini: () => import('@shikijs/langs/ini'),
  properties: () => import('@shikijs/langs/ini'),
}

const bundledThemes = {
  'github-light': () => import('@shikijs/themes/github-light'),
  'github-dark': () => import('@shikijs/themes/github-dark'),
}

export type BundledLang = keyof typeof bundledLangs
export type BundledTheme = keyof typeof bundledThemes

async function getCreateHighlighter() {
  const { createBundledHighlighter } = await import('shiki/core')
  const { createJavaScriptRegexEngine } = await import('shiki/engine/javascript')
  return (createBundledHighlighter as typeof CreateBundledHighlighterFn)({
    langs: bundledLangs,
    themes: bundledThemes,
    engine: () => createJavaScriptRegexEngine(),
  })
}

/** Lightweight codeToHtml — uses the fine-grained bundle, not full `shiki`. */
export async function codeToHtml(
  code: string,
  options: { lang: string; themes: Record<string, string> }
) {
  const createHighlighter = await getCreateHighlighter()
  const highlighter = await createHighlighter({ langs: [], themes: [] })
  await highlighter.loadLanguage(options.lang as BundledLang)
  for (const theme of Object.values(options.themes)) {
    await highlighter.loadTheme(theme as BundledTheme)
  }
  return highlighter.codeToHtml(code, {
    lang: options.lang,
    themes: options.themes as Record<string, BundledTheme>,
    defaultColor: false,
  })
}
