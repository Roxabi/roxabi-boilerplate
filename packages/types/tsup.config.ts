import { defineConfig } from 'tsup'

const watch = process.argv.includes('--watch')

export default defineConfig({
  entry: ['src/index.ts', 'src/api/index.ts', 'src/ui/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: !watch,
})
