# Contributing

## Dev environment setup

**Prerequisites:** Node ≥ 24, Bun 1.3.9+, Docker

```bash
git clone https://github.com/Roxabi/roxabi-boilerplate.git
cd roxabi-boilerplate
cp .env.example .env
bun install          # installs deps + registers Lefthook hooks
bun run db:up        # start Postgres 16 via Docker
bun run db:migrate   # apply migrations
bun run db:seed      # seed development data
bun run dev          # web :3000 · api :4000 · email :3001
```

## Workflow

All development uses **worktrees**. `main` is production, `staging` is the integration branch.

```bash
git worktree add ../roxabi-XXX -b feat/XXX-slug staging
cd ../roxabi-XXX && cp .env.example .env && bun install
cd apps/api && bun run db:branch:create --force XXX
```

```
worktree branch → PR → staging → (promote) → main
```

1. Create a worktree from `staging` (see above)
2. Implement, commit, push
3. Open a PR targeting `staging`
4. Pass CI (lint, typecheck, tests)
5. Merge — never code directly on `main` or `staging`

Exception: XS changes (single file, no risk) can go directly on `staging` after confirmation.

## Commit conventions

[Conventional Commits](https://www.conventionalcommits.org/) — enforced by Commitlint (Lefthook):

```
feat(web): add billing dashboard page
fix(api): handle null tenant in auth guard
chore: bump bun to 1.3.10
test(api): cover subscription renewal edge case
refactor(ui): extract DataTable component
```

- Types: `feat|fix|refactor|docs|style|test|chore|ci|perf`
- Scope: `web`, `api`, `ui`, `types`, `config`, `ci`
- Always include `Co-Authored-By` when pair-programming with Claude

## PR conventions

- Title = Conventional Commits format
- Link the issue: `Closes #N`
- One logical change per PR
- All checks must pass before merge

## Code style

```bash
bun run lint              # Biome lint — must pass
bun run format            # Biome format — auto-fix
bun run typecheck         # TypeScript — must pass
bun run test              # Vitest (not `bun test`) — must pass
bun run test:e2e          # Playwright e2e
```

Style: single quotes, no semicolons, trailing commas (es5), 2-space indent, 100-char width.

Lefthook hooks: pre-commit (Biome), commit-msg (Commitlint), pre-push (lint + typecheck + tests).

## Testing

- Unit tests: Vitest — run with `bun run test` (never `bun test`, that uses the Bun runner)
- E2E tests: Playwright — run with `bun run test:e2e`
- Coverage: `bun run test:coverage`

## Project structure

See [README.md](README.md) for the full project tree. TurboRepo orchestrates builds; each app/package has its own `package.json`.

## Code review

Reviews use [Conventional Comments](https://conventionalcomments.org/). A PR is blocked only for security vulnerabilities, correctness bugs, or direct violations of project standards — style suggestions are non-blocking.

All CI checks (lint, typecheck, tests, i18n, license) must pass before merge. At least one approval is required. For substantial changes, see [docs/standards/code-review.mdx](docs/standards/code-review.mdx).
