# apps/api

NestJS + Fastify + Drizzle ORM. Port 4000.

## Entry Points

- `src/index.ts` — bootstrap (Fastify adapter, Swagger, CORS, helmet, validation pipe)
- `src/app.module.ts` — root module

## Key Directories

```
src/
  database/         Drizzle ORM
    schema/           Table definitions (apiKey, audit, auth, consent, featureFlags, rbac, systemSettings)
    drizzle.provider  DB connection
    helpers/          Query utilities (whereActive)
  auth/             Authentication (guards, decorators, email provider)
  rbac/             Role-based access control
  organization/     Org management
  tenant/           Multi-tenancy
  user/             User module
  admin/            Admin/superadmin
  audit/            Audit logging
  consent/          Consent management
  gdpr/             GDPR compliance
  feature-flags/    Feature flags
  api-key/          API key management
  purge/            Data purge service
  common/           Shared (filters, correlation IDs)
  config/           Env validation
  system-settings/  System configuration
  throttler/        Rate limiting
```

## Database

Schema: `src/database/schema/index.ts` (central export)
Config: `drizzle.config.ts`
Migrations: `drizzle/migrations/`

| Command | What |
|---------|------|
| `bun run db:generate` | Generate migrations from schema |
| `bun run db:migrate` | Run pending migrations |
| `bun run db:reset` | Drop + recreate |
| `bun run db:seed` | Seed data |
| `bun run db:branch:create --force XXX` | Per-worktree DB branch |
| `bun run db:branch:drop XXX` | Drop DB branch |
| `bun run db:branch:list` | List DB branches |
| `bun run db:studio` | Drizzle Studio |

## Scripts

```bash
bun run dev        # nest start --watch
bun run build      # nest build
bun run test       # vitest run
bun run typecheck  # tsc --noEmit
```

## Standards

Read [backend-patterns.mdx](../../docs/standards/backend-patterns.mdx) before writing API code.

## Deploy

Vercel — `main` = prod, `staging` = preview.

## Gotchas

- `useImportType: off` in Biome for this package — NestJS DI needs runtime imports, not `import type`.
- DB branches: each worktree gets its own schema via `db:branch:create --force XXX`. Run from `apps/api/`. Container name read from `POSTGRES_CONTAINER` (default `roxabi-postgres`); branch DB prefix from `DB_BRANCH_PREFIX` (default `POSTGRES_DB` value).
- Global validation pipe: `whitelist + forbidNonWhitelisted + transform`. Unknown properties are stripped.
- Correlation IDs tracked via `nestjs-cls`.
