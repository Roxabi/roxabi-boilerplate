# Roxabi Boilerplate

[![CI](https://github.com/Roxabi/roxabi-boilerplate/actions/workflows/ci.yml/badge.svg)](https://github.com/Roxabi/roxabi-boilerplate/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-green)
![Bun](https://img.shields.io/badge/Bun-runtime-FBF0DF?logo=bun&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![TurboRepo](https://img.shields.io/badge/TurboRepo-monorepo-0ea5e9)
![Biome](https://img.shields.io/badge/Biome-linter-60a5fa)

SaaS boilerplate with AI team integration.

<!-- TODO: Add demo GIF once seed data is ready — see scripts/record-demo.ts -->

## Why

Building SaaS products from scratch means wiring the same infrastructure every time — auth, multi-tenancy, API keys, permissions, email, CI, and documentation. Roxabi Boilerplate ships all of that production-ready so teams can skip to building their actual product.

It pairs a modern TypeScript monorepo with an integrated AI agent team (Claude) for the full development lifecycle — from issue triage to code review to deployment.

## Stack

| Layer | Technology |
|-------|------------|
| Monorepo | Bun + TurboRepo |
| Language | TypeScript 5.x strict |
| Linting | Biome |
| Frontend | TanStack Start |
| Backend | NestJS + Fastify |

## Quick Start

**Prerequisites:** Node ≥ 24, Bun 1.3.9+, Docker

```bash
# 1. Clone and install
git clone https://github.com/Roxabi/roxabi-boilerplate.git
cd roxabi-boilerplate
cp .env.example .env
bun install

# 2. Start the database and apply migrations
bun run db:up
bun run db:migrate
bun run db:seed

# 3. Start all apps
bun run dev   # web :3000 · api :4000 · email :3001
```

```bash
# Common commands
bun run lint          # Biome lint
bun run format        # Biome format
bun run typecheck     # TypeScript
bun run test          # Vitest (not `bun test`)
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

## How it works

A TurboRepo monorepo orchestrates three apps — `web` (TanStack Start + SSR), `api` (NestJS + Fastify), and `docs` (Fumadocs). Shared packages (`ui`, `types`, `config`, `email`) are consumed across apps via Bun workspaces. TurboRepo caches build artifacts so only changed packages rebuild.

```mermaid
flowchart LR
  subgraph Apps
    W[web :3000]
    A[api :4000]
    D[docs :3002]
  end
  subgraph Packages
    UI[ui]
    T[types]
    C[config]
    E[email]
  end
  W --> UI & T & C
  A --> T & C & E
  D --> C
```

## Features

### Auth & identity

| Feature | Details |
|---------|---------|
| Magic link | Passwordless email auth via better-auth |
| Session management | Secure, server-side sessions |
| Organizations | Multi-tenant — invite, switch, manage |
| RBAC | Role-based access control per org |
| API keys | Per-org key issuance and revocation |

### Developer experience

| Feature | Details |
|---------|---------|
| TurboRepo | Build caching and task graph |
| Biome | Lint + format in one fast tool |
| Vitest + Playwright | Unit, integration, and e2e tests |
| Git hooks | Lefthook: pre-commit, commit-msg, pre-push |
| Semantic release | Conventional Commits → changelog + tags |
| AI team | Claude agents covering the full dev lifecycle |

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
