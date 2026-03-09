import type { RehypeCodeOptions } from 'fumadocs-core/mdx-plugins'

/**
 * Shiki configuration for fumadocs-core's rehypeCode plugin.
 *
 * Uses the JS regex engine (experimentalJSEngine) and limits bundled languages
 * to avoid OOM errors on CI. Dual themes (light/dark) are provided via
 * GitHub's built-in themes included in the shiki bundle.
 */
export const shikiOptions = {
  // JS engine avoids Oniguruma WASM OOM on CI; trades tokenisation fidelity for memory safety
  experimentalJSEngine: true,
  themes: {
    light: 'github-light',
    dark: 'github-dark',
  },
  langs: [
    'typescript',
    'tsx',
    'javascript',
    'jsx',
    'bash',
    'shellscript',
    'json',
    'jsonc',
    'yaml',
    'sql',
    'toml',
    'markdown',
    'mdx',
    'css',
    'html',
    'diff',
    'docker',
    'ini',
    'graphql',
    'prisma',
  ],
} satisfies RehypeCodeOptions
