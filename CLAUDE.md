@.claude/stack.yml

# Claude Configuration

## TL;DR

- **Project:** Roxabi Boilerplate — SaaS framework (Bun, TurboRepo, TypeScript, TanStack Start, NestJS, Vercel)
- **Before work:** Use `/dev #N` as the single entry point — it determines tier (S / F-lite / F-full) and drives the full lifecycle
- **All code changes** → worktree: `git worktree add ../roxabi-XXX -b feat/XXX-slug staging`
- **Always** `AskUserQuestion` for choices — ¬plain-text questions
- **¬commit** without asking, **¬push** without request, **¬**`--force`/`--hard`/`--amend`
- **Always** use appropriate skill even without slash command
- **Before code:** Read relevant standards doc (see [Rule 9](#9-coding-standards))
- **Orchestrator** delegates to agents — only minor fixes directly

## Project Overview

SaaS framework with integrated AI team. Vision → [docs/product/vision.mdx](docs/product/vision.mdx).

**Style:** single quotes, no semicolons, trailing commas (es5), 2-space indent, 100-char width

```bash
cp .env.example .env && bun install && bun run db:up && bun run dev  # web:3000 api:4000 email:3001
```

```
apps/web   @repo/web    TanStack Start + Vite + Tailwind v4
apps/api   @repo/api    NestJS + Fastify + Drizzle ORM
apps/docs  @repo/docs   Fumadocs (Next.js) — standalone docs site, port 3002
packages/  ui(@repo/ui) types(@repo/types) config(@repo/config) email vitest-config playwright-config
```

## Commands

| Task | Command | Notes |
|------|---------|-------|
| Dev | `bun run dev` | web:3000, api:4000, email:3001, nitro:42069 |
| Build | `bun run build` | TurboRepo-cached |
| Lint / fix | `bun run lint` / `lint:fix` | Biome |
| Format | `bun run format` | Biome |
| Typecheck | `bun run typecheck` | All packages |
| Test | `bun run test` | Vitest (¬`bun test`) |
| Test watch / coverage / e2e | `test:watch` / `test:coverage` / `test:e2e` | |
| Affected only | `typecheck:affected` / `test:affected` | Changed vs main |
| Kill ports | `bun run dev:clean` | Orphaned 42069/4000/3000/3001 |
| DB up/down | `db:up` / `db:down` | Docker Postgres 16 |
| DB generate/migrate/reset/seed | `db:generate` / `db:migrate` / `db:reset` / `db:seed` | |
| DB branch | `cd apps/api && bun run db:branch:create --force XXX` | Per-worktree |
| Clean | `bun run clean` / `clean:cache` | Artifacts / caches |
| i18n | `bun run i18n:check` | Translation completeness |
| Env check | `bun run env:check` | .env ↔ .env.example |
| MDX check | `bun run mdx:check` | Frontmatter, JSX, links |
| License | `bun run license:check` | Dependency licenses |
| Docs | `bun run docs` | Runs apps/docs (port 3002) |
| Dashboard | `/issues` skill | Issue dashboard (plugin-provided) |

## Critical Rules

### 1. Dev Process

**Entry point: `/dev #N`** — single command that scans artifacts, shows progress, and delegates to the right phase skill. Full spec → [dev-process.mdx](docs/processes/dev-process.mdx).

| Tier | Criteria | Phases |
|------|----------|--------|
| **S** | ≤3 files, no arch, no risk | triage → implement → pr → validate → review → fix* → promote* → cleanup* |
| **F-lite** | Clear scope, single domain | Frame → spec → plan → implement → verify → ship |
| **F-full** | New arch, unclear reqs, >2 domains | Frame → analyze → spec → plan → implement → verify → ship |

`*` = conditional (runs only if applicable — e.g., fix runs only if review produces findings)

Phases: **Frame** (problem) → **Shape** (spec) → **Build** (code) → **Verify** (review) → **Ship** (release).

### 2. AskUserQuestion

Always `AskUserQuestion` for: decisions, choices (≥2 options), approach proposals.
**¬** plain-text "Do you want..." / "Should I..." → use the tool.

### 3. Orchestrator Delegation

Orchestrator ¬modify code/docs. Delegate: FE→`frontend-dev` | BE→`backend-dev` | Infra→`devops` | Docs→`doc-writer` | Tests→`tester` | Fixes→`fixer`. Exception: typo/single-line. Deploy→`devops` only.

### 4. Parallel Execution

≥3 complex tasks → AskUserQuestion: Sequential | Parallel (Recommended).
F-full + ≥4 independent tasks in 1 domain → multiple same-type agents on separate file groups.

### 5. Git

Format: `<type>(<scope>): <desc>` + `Co-Authored-By: Claude <model> <noreply@anthropic.com>`
Types: feat|fix|refactor|docs|style|test|chore|ci|perf
¬push without request. ¬force/hard/amend. Hook fail → fix + NEW commit.
Full spec → [docs/contributing.mdx](docs/contributing.mdx)

### 6. Artifact Model

Artifacts are the state markers `/dev` uses for progress detection and resumption.

| Type | Directory | Question answered |
|------|-----------|-------------------|
| **Frame** | `artifacts/frames/` | What's the problem? |
| **Analysis** | `artifacts/analyses/` | How deep is it? |
| **Spec** | `artifacts/specs/` | What will we build? |
| **Plan** | `artifacts/plans/` | How do we build it? |

### 7. Mandatory Worktree

```bash
git worktree add ../roxabi-XXX -b feat/XXX-slug staging
cd ../roxabi-XXX && cp .env.example .env && bun install
cd apps/api && bun run db:branch:create --force XXX
```

Exceptions: XS (confirm via AskUserQuestion) | `/dev` pre-implementation artifacts (frame, analysis, spec, plan) | `/promote` release artifacts.
**¬code on main/staging without worktree.**

### 8. Code Review

MUST read [code-review.mdx](docs/standards/code-review.mdx). Conventional Comments. Block only: security, correctness, standard violations.

### 9. Coding Standards

| Context | Read |
|---------|------|
| New feature (end-to-end) | [new-feature-pattern.mdx](docs/guides/new-feature-pattern.mdx) |
| React / TanStack | [frontend-patterns.mdx](docs/standards/frontend-patterns.mdx) — see also [apps/web/CLAUDE.md](apps/web/CLAUDE.md) |
| NestJS / API | [backend-patterns.mdx](docs/standards/backend-patterns.mdx) — see also [apps/api/CLAUDE.md](apps/api/CLAUDE.md) |
| Tests | [testing.mdx](docs/standards/testing.mdx) |
| Docs | [contributing.mdx](docs/contributing.mdx) |
| Issues | [issue-management.mdx](docs/processes/issue-management.mdx) |

## Skills & Agents

Skills: always use appropriate skill. Workflow skills → `dev-core` plugin. Local skills (retro, agent-browser) → `.claude/skills/*/SKILL.md`.
Agents: rules → [AGENTS.md](AGENTS.md). Defs → `dev-core` plugin. Guide → [agent-teams.mdx](docs/guides/agent-teams.mdx).

**Agent models:** Sonnet = all agents (frontend-dev, backend-dev, devops, doc-writer, fixer, tester, architect, product-lead, security-auditor).
**Spawns:** Explore/research tasks → `model: "haiku"`. Simple mechanical tasks (grep, summarize, single-line fix) → `model: "haiku"`. Code generation, review, architecture → Sonnet/Opus (agent defaults).

**Workflow skills (via `/dev #N` or standalone):** `dev` (orchestrator) | `frame` | `analyze` | `spec` | `plan` | `implement` | `fix`

**Shared agent rules:** ¬commit/push (lead handles git) | ¬force/hard/amend | stage specific files only | escalate blockers → lead | claim tasks from shared list | create follow-up tasks | security → lead + security-auditor | message lead on completion.

## Gotchas

- `bun test` ≠ `bun run test` — former = Bun runner (CPU spin), latter = Vitest. Hook blocks it.
- `turbo.jsonc` ¬`turbo.json` — JSONC with comments.
- Node ≥24, Bun 1.3.9 = pkg manager.
- Orphaned ports → `bun run dev:clean`.
- Biome upgrade → sync `$schema` version in `biome.json`.
- Sub-issues: `addSubIssue` GraphQL mutation, ¬markdown checklists. Use `/issue-triage --parent`.
- Post-rebase: `bun install` before push if new build steps added.
- `gh pr edit --add-label` broken (Projects Classic deprecation) → use `gh api repos/:owner/:repo/issues/:number/labels -f "labels[]=<label>"`.
- `gh pr view --json` has no `merged` field → use `mergedAt` (null = not merged).
- Domain gotchas → [apps/api/CLAUDE.md](apps/api/CLAUDE.md) and [apps/web/CLAUDE.md](apps/web/CLAUDE.md).

## Reference

| Topic | Path |
|-------|------|
| Getting started | [getting-started.mdx](docs/getting-started.mdx) |
| Config | [configuration.mdx](docs/configuration.mdx) |
| Dev process | [dev-process.mdx](docs/processes/dev-process.mdx) |
| Issues | [issue-management.mdx](docs/processes/issue-management.mdx) |
| Architecture | [docs/architecture/](docs/architecture/) |
| FE / BE / Test / Review | [frontend-patterns](docs/standards/frontend-patterns.mdx) / [backend-patterns](docs/standards/backend-patterns.mdx) / [testing](docs/standards/testing.mdx) / [code-review](docs/standards/code-review.mdx) |
| Contributing | [contributing.mdx](docs/contributing.mdx) |
| Deploy / Auth / Agents | [deployment](docs/guides/deployment.mdx) / [authentication](docs/guides/authentication.mdx) / [agent-teams](docs/guides/agent-teams.mdx) |
| Vision | [vision.mdx](docs/product/vision.mdx) |
| Frames / Analyses / Specs / Plans | [artifacts/frames/](artifacts/frames/) / [artifacts/analyses/](artifacts/analyses/) / [artifacts/specs/](artifacts/specs/) / [artifacts/plans/](artifacts/plans/) |

**Deploy:** `main` → Vercel prod. `staging` → preview. Details in [apps/web/CLAUDE.md](apps/web/CLAUDE.md) and [apps/api/CLAUDE.md](apps/api/CLAUDE.md).

**Hooks (Claude Code):** Biome auto-format (PostToolUse) | Security warn (PreToolUse) | `bun test` blocker (PreToolUse)
**Hooks (Git/Lefthook):** pre-commit (Biome) | commit-msg (Commitlint) | pre-push (lint+typecheck+tests+i18n+license)
