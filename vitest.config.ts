import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'apps/web/vitest.config.ts',
      'apps/api/vitest.config.ts',
      'packages/ui/vitest.config.ts',
      'packages/email/vitest.config.ts',
      'tools/vitest.config.ts',
      '.claude/skills/vitest.config.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/test/**',
        '**/e2e/**',
        '**/index.ts',
        'packages/config/**',
        'packages/types/**',
        // Generated files
        '**/*.gen.ts',
        // Framework/routing files
        '**/routes/**',
        '**/__root.tsx',
        '**/router.tsx',
        // Infrastructure/boilerplate files
        '**/*-error-boundary.tsx',
        '**/not-found.tsx',
        '**/layout.shared.tsx',
        '**/source.ts',
        // NestJS bootstrap and module wiring
        '**/main.ts',
        '**/*.module.ts',
        '**/database/schema/*.ts',
        // Auth client instantiation (no logic, just config)
        '**/lib/auth-client.ts',
        // i18n infrastructure (React hooks/components - tested via integration)
        '**/lib/i18n/client.ts',
        '**/lib/i18n/context.ts',
        '**/lib/i18n/hooks.ts',
        '**/lib/i18n/seo.tsx',
        // Component files need integration/e2e tests
        '**/components/LanguageSwitcher.tsx',
        '**/components/admin/**',
        // Presentation/talk section components (visual-only, no business logic)
        '**/components/presentation/dev-process/**',
        '**/components/presentation/lyra-story/**',
        '**/components/presentation/lyra-dev/**',
        '**/components/presentation/lyra-product/**',
        '**/components/presentation/lyra-product/**',
        // Pure Radix UI re-export wrappers (no business logic)
        '**/components/ContextMenu.tsx',
        '**/vite-env.d.ts',
        // Type declaration files (including pure-type .ts files)
        '**/*.d.ts',
        '**/lib/avatar/types.ts',
        // Server entry point (infrastructure)
        '**/server.ts',
        // Generated i18n runtime (paraglide)
        '**/paraglide/**',
      ],
      // See artifacts/specs/17-testing-gold-standard.mdx for rationale.
      thresholds: {
        lines: 92,
        functions: 89,
        branches: 84,
        statements: 91,
      },
    },
  },
})
