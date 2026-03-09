# Roxabi Boilerplate

![Bun](https://img.shields.io/badge/Bun-runtime-FBF0DF?logo=bun&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![TurboRepo](https://img.shields.io/badge/TurboRepo-monorepo-0ea5e9)
![Biome](https://img.shields.io/badge/Biome-linter-60a5fa)

SaaS boilerplate with AI team integration.

<!-- TODO: Add demo GIF once seed data is ready — see scripts/record-demo.ts -->

## Stack

| Layer | Technology |
|-------|------------|
| Monorepo | Bun + TurboRepo |
| Language | TypeScript 5.x strict |
| Linting | Biome |
| Frontend | TanStack Start |
| Backend | NestJS + Fastify |

## Quick Start

```bash
# Install dependencies
bun install

# Run development
bun dev

# Lint & format
bun lint
bun format

# Type check
bun typecheck
```

## Structure

```
roxabi_boilerplate/
├── apps/
│   ├── web/          # Frontend (TanStack Start)
│   ├── api/          # Backend (NestJS + Fastify)
│   └── docs/         # Documentation site (Fumadocs + Next.js)
├── packages/
│   ├── ui/           # Shared UI components
│   ├── config/       # Shared configurations
│   ├── types/        # Shared TypeScript types
│   ├── email/        # Email templates
│   ├── vitest-config/ # Shared Vitest configuration
│   └── playwright-config/ # Shared Playwright configuration
└── docs/             # MDX source files (rendered by apps/docs)
```

## Git Hooks

Git hooks are configured using [Lefthook](https://github.com/evilmartians/lefthook) and are installed automatically on `bun install`.

| Hook | Purpose | Speed |
|------|---------|-------|
| **Commit-msg** | Validate Conventional Commits format | <1s |
| **Pre-commit** | Auto-format staged files with Biome | <1s |
| **Pre-push** | Full validation (lint, typecheck, tests, i18n, license) | <30s (cached) |

**Bypass for emergencies:** Use `--no-verify` flag (CI is the ultimate enforcement).

## Development Process

```
GitHub Issue → Branch → Implement → PR → Review → Merge
```

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/index.mdx](docs/index.mdx) | Documentation home |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [docs/getting-started.mdx](docs/getting-started.mdx) | Getting started guide |
| [docs/configuration.mdx](docs/configuration.mdx) | Configuration reference |
| [docs/contributing.mdx](docs/contributing.mdx) | Contributing guidelines (detailed) |
| [docs/hooks.mdx](docs/hooks.mdx) | Git hooks & CI hooks |
| [docs/architecture/](docs/architecture/) | Architecture decisions & diagrams |
| [docs/standards/](docs/standards/) | Coding standards (FE, BE, testing, code review) |
| [docs/guides/](docs/guides/) | Guides (auth, deployment, i18n, security, etc.) |
| [docs/processes/](docs/processes/) | Dev process & issue management |
| [docs/product/](docs/product/) | Product vision & strategy |
| [docs/changelog/](docs/changelog/) | Release changelog |

## License

MIT
