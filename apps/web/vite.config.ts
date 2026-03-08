import { fileURLToPath, URL } from 'node:url'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, loadEnv, type Plugin, type PluginOption, type ResolvedConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { z } from 'zod'

const apiTarget = process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? 4000}`

// Duplicated from env.shared.ts — Vite config runs outside the app bundle
// and cannot import app source. Keep in sync manually; check-env-sync.ts
// will detect drift between this schema and env.shared.ts.
function validateEnvPlugin(): Plugin {
  return {
    name: 'validate-env',
    configResolved(config: ResolvedConfig) {
      if (config.command === 'build') {
        const envVars = loadEnv(config.mode, config.envDir ?? process.cwd(), 'VITE_')
        const schema = z.object({
          VITE_GITHUB_REPO_URL: z.string().url().optional(),
        })
        const result = schema.safeParse(envVars)
        if (!result.success) {
          throw new Error(
            `Client env validation failed:\n${result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`
          )
        }
      }
    },
  }
}

async function getPlugins() {
  return [
    validateEnvPlugin(),
    devtools(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['cookie', 'preferredLanguage', 'url', 'baseLocale'],
    }),
    nitro({
      config: {
        builder: 'rolldown',
        // NOTE: do NOT add `devProxy` here. Nitro's devProxy uses http-proxy via
        // h3's fromNodeHandler, which stores response headers in a Web API Headers
        // object that silently merges multiple Set-Cookie values into a single
        // comma-joined string — corrupting multi-cookie responses (e.g. better-auth's
        // set-active-org which sets both the session and activeOrganizationId cookies).
        //
        // The routeRules proxy below uses h3's proxyRequest(), which explicitly
        // appends each Set-Cookie header separately and works correctly. It is active
        // in both dev and production, giving full dev/prod parity.
        routeRules: {
          '/api/**': { proxy: `${apiTarget}/api/**` },
        },
      },
    }),
    // this is the plugin that enables path aliases
    // Include all packages with @ aliases for proper monorepo resolution
    viteTsConfigPaths({
      projects: [
        './tsconfig.json',
        '../../packages/ui/tsconfig.json',
        '../../packages/email/tsconfig.json',
      ],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ] as PluginOption[]
}

const config = defineConfig(async () => ({
  envDir: '../..',
  build: { chunkSizeWarningLimit: 1000 },
  server: { port: Number(process.env.APP_PORT) || 3000 },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: await getPlugins(),
}))

export default config
