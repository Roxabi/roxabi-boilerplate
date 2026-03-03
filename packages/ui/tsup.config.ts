import { defineConfig } from 'tsup'

const watch = process.argv.includes('--watch')

export default defineConfig({
  entry: ['src/index.ts', 'src/styles.css'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: !watch,
  external: ['react', 'react-dom'],
  banner: {
    js: '"use client";',
  },
  loader: {
    '.css': 'copy',
  },
  esbuildOptions(options) {
    options.alias = {
      '@': './src',
    }
  },
})
