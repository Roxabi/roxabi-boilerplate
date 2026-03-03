# Knowledge-Informed Audit & Roadmap

**Date:** 2026-02-28
**Branch:** staging
**Version:** v0.5.1
**Sources:** 40+ knowledge entries from 2ndBrain (Feb 23-28) + 14 older saves (Jan 29 - Feb 5) + full repo audit

---

## Summary Table

| # | Item | Horizon | Effort | Impact | Category |
|---|------|---------|--------|--------|----------|
| 1 | Fix open security issues (#402, #406) | **NOW** | S | Critical | Security |
| 2 | Disable auto-memory in CI | Short | XS | High | DX |
| 3 | Path-scoped rules `.claude/rules/` | Short | S | High | DX |
| 4 | JSONL cost logging Stop hook | Short | S | High | DX |
| 5 | Session init protocol for agents | Short | S | High | DX |
| 6 | Verification loop in `/implement` | Short | S | Medium | DX |
| 7 | Split large SKILL.md into refs/ | Short | M | Medium | DX |
| 8 | Wire rate-limit API tier | Short | S | Medium | SaaS |
| 9 | Bilingual legal pages | Short | S | Medium | SaaS |
| 10 | E2E test coverage expansion | Short | M | High | Testing |
| 11 | Agent-conductor dashboard | Mid | M | High | DX |
| 12 | AgentShield security scanner | Mid | S | High | Security |
| 13 | Verification artifacts | Mid | M | High | DX |
| 14 | api2cli skill | Mid | M | Medium | DX |
| 15 | Autonomous dogfooding `/dogfood` | Mid | M | High | Testing |
| 16 | Plan-challenge skill | Mid | S | Medium | DX |
| 17 | MCP server integrations | Mid | M | Medium | DX |
| 18 | Billing / Stripe integration | Mid | L | Critical | SaaS |
| 19 | Onboarding wizard | Mid | M | High | SaaS |
| 20 | Observability stack (#371-377) | Mid | L | High | SaaS |
| 21 | Feature flags v2 (per-user/per-org) | Mid | M | Medium | SaaS |
| 22 | Deploy safety: migration gate | Mid | S | High | Infra |
| 23 | Control plane for user-facing agents | Long | XL | Strategic | Architecture |
| 24 | Programmatic Tool Calling (PTC) | Long | L | High | DX |
| 25 | Notifications system | Long | L | High | SaaS |
| 26 | Chat SDK integration | Long | L | Medium | SaaS |
| 27 | Public developer API (#194) | Long | L | High | SaaS |
| 28 | Eval harness for agent quality | Long | L | Medium | DX |
| 29 | LLM OWASP in security-auditor | Long | M | High | Security |
| 30 | Plugin architecture layer | Long | L | Strategic | Architecture |
| 31 | Dashboard: agent session tab | Long | M | Medium | DX |
| 32 | Dashboard: cycle time tracking | Long | S | Medium | DX |
| 33 | Dashboard: dep graph enhancements | Long | S | Low | DX |
| 34 | Community / education platform | Long | M | Medium | Product |

---

## Current State

Roxabi Boilerplate is ahead of the curve on agent-powered dev workflow and core SaaS features. Auth, multi-tenancy, RBAC, admin panel (3 phases), API keys, audit logging, GDPR, email, feature flags, i18n — all implemented with 190 test files. 20+ skills, 9 specialized agents, SSE-powered dashboard on :3333.

### Feature Inventory

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication (email+password, magic link, OAuth) | Done | Better Auth + Drizzle adapter |
| Multi-tenancy / Organizations | Done | Hierarchical nesting, slug, logo, soft-delete |
| RBAC (4 default roles, custom roles, permissions) | Done | Decorators + guards + frontend helpers |
| Admin Panel (users, orgs, members, audit, flags, settings) | Done | 3 phases, superadmin-only |
| API Keys (tenant-scoped, hashed, scoped, rate-limit tier) | Done | One-time display, permission-gated |
| Audit Logging (actor, before/after, metadata) | Done | Preserved on user deletion |
| GDPR & Consent (banner, export, purge cron) | Done | French-first legal pages |
| Email (Resend, React Email, EN/FR) | Done | Magic link, verification, reset |
| Feature Flags | Done | Global admin toggles, in-memory cache |
| System Settings | Done | Categorized key-value store |
| i18n (Paraglide, EN/FR) | Done | 1,398 keys, cookie+URL strategy |
| Rate Limiting (3 tiers) | Done | Upstash Redis prod, in-memory preview |
| Landing Page | Done | Hero, Features, AiTeam, DX, TechStack, Stats, CTA |
| In-App Documentation (Fumadocs MDX) | Done | Bilingual search |
| Talks / Presentations | Done | 2 decks (Claude Code, Dev Process) |
| Billing / Subscriptions | Not started | Spec #194 exists, issues #335/#336 open |
| Notifications (push, in-app, webhooks) | Not started | No schema, no module |
| Onboarding wizard | Not started | No dedicated route |
| Observability (Pino, Sentry, PostHog, Web Vitals) | Not started | Specs #371-377 exist |
| Public Developer API | In design | Spec #194 in artifacts |

### Open Security Issues (URGENT)

| Issue | Severity | Description |
|-------|----------|-------------|
| #402 | HIGH | Magic link tokens logged in plaintext in console email fallback |
| #406 | HIGH | Unvalidated path params + CRON_SECRET optional + Swagger exposed on preview |

These should be addressed before any new feature work.

### Infrastructure Snapshot

- **CI/CD:** 6 GitHub Actions workflows (ci, deploy-preview, auto-merge, pr-title, neon-cleanup, pr-review disabled)
- **Database:** PostgreSQL 16 via Docker (local) / Neon (cloud). Drizzle ORM, 6 migrations, RLS tenant isolation
- **Deploy:** Vercel (web + API). `main` = prod, `staging` = preview. Docker Compose prod option with GHCR images
- **Testing:** Vitest (190 test files) + Playwright (3 e2e specs, 17 tests). Coverage via v8
- **Dashboard :3333:** Issues, PRs, branches, worktrees, Vercel deploys, CI status, workflow runs — all with SSE live refresh
- **Packages:** `@repo/ui` (42 components), `@repo/types` (12 modules), `@repo/config`, `@repo/email` (6 templates)
- **Skills:** 20+ (dev, frame, analyze, spec, plan, implement, review, fix, test, validate, pr, promote, cleanup, 1b1, compress, interview, issue-triage, issues, retro, adr, agent-browser)
- **Agents:** 9 (architect, backend-dev, frontend-dev, devops, doc-writer, fixer, tester, product-lead, security-auditor)
- **Hooks:** Biome auto-format (PostToolUse), security check (PreToolUse), bun test blocker (PreToolUse)
- **Git hooks:** Commitlint (commit-msg), Biome (pre-commit), lint+typecheck+test+i18n+license (pre-push)
- **MCP:** None configured. No `.mcp.json` exists. All tool access via native Claude Code tools
- **Plugins:** 11 marketplace plugins enabled (frontend-design, ui-ux-pro-max, context7, plugin-dev, etc.)

---

## SHORT TERM (2-4 weeks)

### Security (Fix First)

#### 1. Fix open security issues (#402, #406)

Three active security bugs must be resolved before feature work:

- **#402:** Magic link tokens logged in plaintext in console email fallback. Stop logging sensitive tokens in development fallback.
- **#406a:** Unvalidated path params in API routes. Add Zod/class-validator on all route params.
- **#406b:** `CRON_SECRET` is optional. If unset in production, the purge cron endpoint (`POST /api/internal/purge`) is callable without authentication. Make it required in production.
- **#406c:** Swagger exposed on preview. `SWAGGER_ENABLED` defaults to true when `NODE_ENV !== 'production'`. Vercel preview deploys may not set `NODE_ENV=production`, exposing full API docs. Lock Swagger behind an explicit opt-in env var.

**Effort:** S | **Impact:** Critical

### DX & Tooling Quick Wins

#### 2. Disable auto-memory in CI

CI sessions can corrupt project auto-memory with ephemeral failure patterns. Add to all `.github/workflows/*.yml`:

```yaml
env:
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1"
```

**Effort:** XS | **Impact:** High (prevents memory corruption)

#### 3. Path-scoped rules in `.claude/rules/`

Split CLAUDE.md domain knowledge into scoped files with YAML frontmatter. Claude only loads rules matching the files being touched — ~40% context window reduction per session.

```
.claude/rules/
  frontend.md      # paths: apps/web/**/*.{ts,tsx}
  backend.md       # paths: apps/api/src/**/*.ts
  database.md      # paths: apps/api/src/db/**
  tests.md         # paths: **/*.test.ts, **/*.spec.ts
  ci.md            # paths: .github/**/*.yml
```

**Effort:** S | **Impact:** High (token savings compound across every session)

#### 4. JSONL cost logging Stop hook

No visibility into session costs today. Add a Stop hook writing:

```json
{
  "timestamp": "2026-02-28T10:00:00Z",
  "session_id": "...",
  "model": "claude-sonnet-4-6",
  "input_tokens": 45000,
  "output_tokens": 8000,
  "cost_usd": 0.142,
  "task_type": "implement",
  "agent": "backend-dev"
}
```

Formula: `(inputTokens / 1M) * inputPrice + (outputTokens / 1M) * outputPrice`

Plus a `bun run costs` command that surfaces expensive patterns.

**Effort:** S | **Impact:** High (cost visibility for multi-agent sessions)

#### 5. Session initialization protocol for agents

Agents start working without reading prior context. Add a mandatory preamble to `backend-dev` and `frontend-dev` definitions:

```
Before any file modification:
1. git log --oneline -10
2. Read plan artifact: ls artifacts/plans/<N>-*.mdx | head -1
3. Identify highest-priority incomplete task
4. git status (check for uncommitted prior work)
5. bun run typecheck 2>&1 | tail -5
```

Directly addresses Anthropic's finding that session continuity is the primary cause of duplicate work.

**Effort:** S | **Impact:** High

#### 6. Verification loop in `/implement`

After agent writes code: `typecheck + test:affected` -> read failures -> fix -> retry (max 3x) before surfacing to orchestrator. Currently `/validate` is a separate step. Embedding a lightweight loop reduces the verify phase overhead.

**Effort:** S | **Impact:** Medium

#### 7. Split large SKILL.md files

Move `/review`, `/dev`, `/implement` detail into `references/` subdirs with just-in-time loading. Core SKILL.md stays under 500 lines; reference files load on demand.

```
.claude/skills/review/
  SKILL.md              # core workflow, decision trees
  references/
    finding-format.md   # loaded when writing findings
    edge-cases.md       # loaded on demand
    merge-procedure.md  # loaded only at Phase 8
```

**Effort:** M | **Impact:** Medium (context window optimization)

### SaaS & Testing Gaps

#### 8. Wire rate-limit API tier

`RATE_LIMIT_API_*` env vars are reserved but not connected to the throttler. Per-API-key rate limits are expected in any public API.

**Effort:** S | **Impact:** Medium

#### 9. Bilingual legal pages

Legal routes are French-named (`cgu.tsx`, `confidentialite.tsx`). English content may be incomplete. i18n compliance gap for a boilerplate targeting international users.

**Effort:** S | **Impact:** Medium

#### 10. E2E test coverage expansion

Current Playwright coverage is minimal (17 tests across 3 specs). Major flows have zero e2e coverage:

| Missing Flow | Priority |
|-------------|----------|
| Registration / signup | High |
| Admin panel (users, roles, invitations, audit, flags, settings) | High |
| Organization CRUD + switching | High |
| User profile / settings / avatar | Medium |
| API key create / revoke | Medium |
| Consent banner / cookie acceptance | Medium |
| GDPR (account deletion, reactivation) | Medium |
| Email verification / magic link | Medium |
| Password reset | Medium |
| Multi-org membership / org settings | Low |

The redirect-unauthenticated test is permanently `test.skip`'d (SSR limitation). Auth/dashboard tests skip when `DATABASE_URL` is absent.

**Effort:** M | **Impact:** High

---

## MID TERM (1-3 months)

### Dev Workflow Upgrades

#### 11. Agent-conductor multi-session dashboard

Kanban view of active agent sessions with approve/reject prompts, parent-child subagent visualization. Local-only (SQLite + WebSocket on :4444, React on :5173). Add PostToolUse hooks to feed it events. Complementary to issues dashboard on :3333.

**Effort:** M | **Impact:** High for F-full tier parallel sessions

#### 12. AgentShield security scanner

`npx ecc-agentshield scan` as pre-push hook or CI step. 1282 tests, 102 static analysis rules. Audits `.claude/settings.json`, skills, agents, MCP configs for injection risks, secrets, permission issues. Current `security-check.js` only checks code being written — not the AI config itself.

**Effort:** S | **Impact:** High (security blind spot)

#### 13. Verification artifacts

New `artifacts/verifications/<N>-<slug>.json` after implementation:

```json
{
  "issue": 42,
  "tier": "F-lite",
  "timestamp": "2026-02-28T...",
  "lint": "pass",
  "typecheck": "pass",
  "tests": { "total": 47, "passed": 47, "failed": 0, "coverage": "84%" },
  "spec_criteria": [
    { "criterion": "User can login with email/password", "status": "pass" },
    { "criterion": "Invalid credentials return 401", "status": "pass" }
  ]
}
```

Enables machine-verifiable completion proofs. The `/review` skill reads this to know what was already verified.

**Effort:** M | **Impact:** High

#### 14. api2cli skill

Auto-wrap internal API + Stripe/Resend/Better Auth as agent-consumable CLIs. Generates `.claude/skills/{service}/SKILL.md` for each service. Agents stop re-reading source code for each API call. Output envelope includes `next_actions` for composability.

**Effort:** M | **Impact:** Medium

#### 15. Autonomous dogfooding skill (`/dogfood`)

agent-browser explores the app like a real user: navigation, clicks, forms, edge cases. Generates severity reports + repro videos + screenshots. Trigger on PR open against Vercel preview URL. Catches UX regressions before human review.

Install: `npx skills add https://github.com/vercel-labs/agent-browser --skill dogfood`

**Effort:** M | **Impact:** High

#### 16. Plan-challenge skill (`/challenge-plan`)

Before implementation, submit plan artifact to a different model with extended reasoning for critique. Prompt: "What's the single smartest and most radically innovative addition to this plan?" Catches blind spots agents and humans share.

**Effort:** S | **Impact:** Medium

#### 17. MCP server integrations

No MCP servers configured despite having `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Candidates:

| MCP Server | Value |
|-----------|-------|
| Postgres MCP | Direct DB queries from agents without bash psql |
| GitHub MCP | Richer issue/PR interaction than `gh` CLI |
| Figma MCP | Design-to-code pipeline for frontend-dev agent |
| Filesystem MCP | Scoped file access for sandboxed agents |

**Effort:** M | **Impact:** Medium

### SaaS Features

#### 18. Billing / Stripe integration

The #1 missing SaaS primitive. Abstracted payment layer with Stripe as default, switchable to Paddle/Lemon Squeezy. Spec exists (#194). Issues #335 (billing portal) and #336 (usage metering) are open. No `billing` or `subscription` tables exist in the database schema yet.

**Effort:** L | **Impact:** Critical

#### 19. Onboarding wizard

First-time user flow with step-by-step guide. No dedicated route exists today. Founders fail by obsessing over stack instead of product — the onboarding IS the product's first impression.

**Effort:** M | **Impact:** High

#### 20. Observability stack

All specced (#371-377), none built. Note: `turbo.jsonc` has no Sentry or PostHog env vars in `globalPassThroughEnv` yet — these must be added when implementing.

- Pino structured logging (#373)
- Sentry backend (#374) + frontend (#375)
- PostHog analytics (#376)
- Web Vitals / Lighthouse (#377)
- Audit auto-capture interceptor (#378)

CSP headers will need `*.ingest.sentry.io` and PostHog hosts added to `connectSrc`.

**Effort:** L | **Impact:** High

#### 21. Feature flags v2

Current flags are admin-only global toggles (not tenant-scoped — no `tenantId` column). Missing per-user/per-org targeting, percentage rollouts. Consider PostHog integration for production-grade flags.

**Effort:** M | **Impact:** Medium

#### 22. Deploy safety: migration gate

`apps/api/vercel.json` runs `bun run db:migrate` as part of the build step. Every deploy automatically migrates. If a migration is destructive and the deploy needs rollback, the DB change is irreversible. Add a migration preview/approval step, at minimum a dry-run check in CI before deploy.

**Effort:** S | **Impact:** High

---

## LONG TERM (3-6 months)

### Strategic Architecture

#### 23. Control plane for user-facing agents

When Roxabi ships runtime agents for end-users, architecture must change:

```
User Request
  -> NestJS API (Control Plane)
     -> validates JWT + per-user cost cap
     -> spawns Docker container (zero secrets inside)
     -> container calls back to API for authenticated ops
     -> API logs all actions with user_id + session_id
  -> Agent Sandbox (micro-VM or Docker)
     receives: SESSION_TOKEN, CONTROL_PLANE_URL, SESSION_ID
     has: zero secrets, zero direct DB access
```

Browser Use's maxim: "Your agent should have nothing worth stealing and nothing worth preserving." The NestJS API layer is already the right control plane foundation. Ramp's Inspect pattern adds: session multiplexing via Durable Objects (SQLite per session), Modal for instant sandbox startup with state snapshots, and multi-client support (Slack, web, VS Code, browser extension) as virality vectors.

**Effort:** XL | **Impact:** Strategic

#### 24. Programmatic Tool Calling (PTC)

For analysis-heavy skills (`/analyze`, `/review`, `/spec`): replace 20+ sequential Grep/Read calls with a single code execution block. Anthropic measured 37% token reduction and +10% on SWE-bench. Available on `claude-opus-4-6` and `claude-sonnet-4-6` via `code_execution_20260120` tool type.

**Effort:** L | **Impact:** High

#### 25. Notifications system

Push, in-app, webhooks. No schema, module, or table exists today. Common SaaS expectation. No `webhooks` table either, despite the public API developer platform epic (#194).

**Effort:** L | **Impact:** High

#### 26. Chat SDK integration

Vercel's `@vercel/chat` for Slack/Teams/Discord chatbot access. Aligns with the "meta-app" vision — users interact via chat, not just web UI. Event-driven architecture with type-safe handlers and JSX cards that render natively per platform.

**Effort:** L | **Impact:** Medium

#### 27. Public developer API (#194)

Spec exists. With api2cli, the generated CLI becomes both human and agent interface. OpenAPI-generated, rate-limited, API-key authenticated.

**Effort:** L | **Impact:** High

#### 28. Eval harness for agent output quality

Structured LLM evaluations against skill outputs. Score completeness, accuracy, actionability. The boilerplate's differentiator is the AI team — measuring its quality is critical for credibility.

**Effort:** L | **Impact:** Medium

#### 29. LLM OWASP Top 10 in security-auditor

Extend beyond web OWASP to cover:
- LLM01: Prompt injection (direct + indirect via GitHub issue bodies)
- LLM04: Token DoS (unbounded agent loops — current `maxTurns: 50` helps but isn't sufficient)
- LLM06: PII in context windows (`.env` readable by bypassPermissions agents)
- LLM07: MCP tool scope minimization
- LLM08: Excessive agency (irreversible actions without gates — e.g. `db:migrate`)
- LLM09: Overreliance (inadequate human review of agent output)

**Effort:** M | **Impact:** High

#### 30. Plugin architecture layer

Anthropic's `knowledge-work-plugins` repo demonstrates how to build domain-specific extensions without modifying core: 11 domain plugins (sales, support, product, marketing, finance, legal, etc.) with standardized file structure + MCP server integration + slash commands. Roxabi ships 11 marketplace plugins but has no internal plugin architecture for extending the boilerplate itself. This matters for the SaaS product story — extensibility without forking.

**Effort:** L | **Impact:** Strategic

### Dashboard :3333 Enhancements

#### 31. Agent session tab

Add a tab showing active/recent agent sessions, model usage, cost per session. Reads from JSONL cost log (#4). Current dashboard is issue-focused; this adds agent-focused observability.

**Effort:** M | **Impact:** Medium

#### 32. Cycle time tracking

Add `created_at` -> `merged_at` per issue. Surface as a metric in dashboard. Even rough tracking creates accountability and enables retrospective analysis.

**Effort:** S | **Impact:** Medium

#### 33. Dependency graph enhancements

Current SVG graph exists. Add blocking-path highlighting and critical-path identification.

**Effort:** S | **Impact:** Low

#### 34. Community / education platform

From LinkedIn content analysis: Roxabi is already building community presence (Discord lives on AIDD, Sophia Antipolis developer events). The talks feature (roxabi.vercel.app/talks/) is a differentiator. Formalize:
- Talk recaps + transcripts in docs
- Skills best practices guide (public-facing)
- Hook/guardrail patterns library
- Token cost benchmarks (50% compression achievement is marketable)

**Effort:** M | **Impact:** Medium

---

## Technical Debt & Observations

### Positive Signals (Low Debt)

- 190 test files, Biome 500-line file limit, schema drift detection in CI
- Env sync check, license checker, commitlint, PR title validation enforced
- Security hook prevents accidental secret commits
- Soft-delete + purge cron properly implemented (GDPR)
- Audit trail with `ON DELETE NO ACTION` (preserved on user delete)
- RLS tenant isolation at database level
- CORS wildcard `*` explicitly blocked in production (tested)
- HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy all correct

### Debt / Flags

| Item | Risk | Notes |
|------|------|-------|
| `pr-review.yml.disabled` | Low | Workaround, not clean removal |
| `unsafe-inline` in CSP scriptSrc/styleSrc | Medium | Required for Swagger UI (unpkg.com dependency) |
| `unpkg.com` in CSP | Medium | CDN compromise = CSP bypass vector |
| `@huggingface/transformers` + `sqlite-vec` in devDeps | Low | ML deps from `/retro` skill semantic search. Heavyweight for dev tool |
| `crossOriginEmbedderPolicy: false` | Low | Intentional for cross-origin fonts/images |
| Better Auth admin plugin disabled | Low | Intentional — all admin via NestJS AdminModule |
| `scripts/recordDemo.ts`, `scripts/renameFiles.ts` | Low | One-off utils, not part of standard workflow |
| Feature flags not tenant-scoped | Medium | Global only, no `tenantId` column |
| `docker-compose.prod.yml` has no reverse proxy config | Medium | Assumes nginx/Caddy externally, but no config shipped |
| `fumadocs-mdx` + `shiki` in regular deps (not devDeps) | Low | Needed for docs build pipeline |
| Migrations auto-run on deploy | High | See item #22 |
| Upstash Redis only in production | Low | Preview envs use in-memory (resets on cold start) |

### Database Schema Notes

16 tables across 7 domain schemas. All well-organized. Notable:
- `organizations.parentOrganizationId` self-reference exists but parent tenant resolution is deferred (TODO in tenant interceptor — issue #389 Slice V4)
- No `billing`, `subscription`, `notifications`, or `webhooks` tables
- `featureFlags` and `systemSettings` are global (not tenant-scoped)
- `apiKeys` uses hash+salt pattern (secure, never stores plaintext)

### Turbo Pipeline Notes

- Build inputs exclude test/story files (good cache optimization)
- `test` depends on `^build` but not `codegen` (tests don't wait for route tree gen)
- No Sentry or PostHog vars in `globalPassThroughEnv` (must add when implementing #371)
- `REDIS_*` in build env is vestigial — actual Upstash vars are `KV_REST_API_*`

### Open Issues Snapshot (Top 20)

| # | Title | Type |
|---|-------|------|
| 410 | Low-priority code quality cleanup from standards audit | chore |
| 409 | FE architecture gaps — dual permission systems + profile fetch + ApiKey types | bug |
| 408 | BE architecture gaps — cross-module exception import + circular dep | bug |
| 406 | Unvalidated path params + CRON_SECRET optional + Swagger exposed | security |
| 405 | Domain exception standards — raw Error throws + missing setPrototypeOf | bug |
| 403 | Diverged user anonymization logic between user-initiated and cron purge | bug |
| 402 | Magic link tokens logged in plaintext | security |
| 400 | Code quality gaps from FE/BE standards audit | bug |
| 387 | New feature pattern guide — auth decorators, packages, patterns | docs |
| 386 | Plugin-dev toolkit analysis — integration opportunities for /dev | research |
| 378 | Audit auto-capture interceptor | feature |
| 377 | Web Vitals + Lighthouse CI | feature |
| 376 | PostHog analytics + feature flags | feature |
| 375 | Sentry frontend error tracking | feature |
| 374 | Sentry backend error tracking + CI source maps | feature |
| 373 | Pino structured logging | feature |
| 371 | Epic: production monitoring & analytics stack | epic |
| 351 | V6 Step 0 — Production-grade AI agent foundations | feature |
| 336 | Usage metering — seats, API calls, storage tracking | feature |
| 335 | Self-serve billing portal + pricing page | feature |

---

## Strategic Positioning

### Three convergent themes from 40+ knowledge entries

**1. "The harness is the product, not the model"**

From Anthropic's harness engineering research, Charlie Guo's playbook, Martin Fowler, and the Decapod project: the bottleneck has shifted from model capability to the quality of infrastructure wrapping the model. CLAUDE.md + AGENTS.md + skills + artifacts IS the competitive moat. Teams that invest in harness engineering get compounding returns; teams that prompt-engineer get diminishing returns. OpenAI's case study: 3 engineers produced 1,500 PRs over 5 months (3.5 PRs/engineer/day) — made possible by 5 months of harness investment.

**2. "Context engineering is the new moat"**

From Shubham Saboo (Google PM), Greg Isenberg's Obsidian+Claude system, and the elite engineering culture analysis: "The real competitive edge lies in context rather than in the models themselves." Every well-written doc in Roxabi compounds — it improves both human onboarding AND agent performance. The `docs/` directory is simultaneously documentation and AI context. The `artifacts/` system is institutional memory. The `.claude/agents/*.md` files are externalized expertise. This is genuinely rare.

**3. "Small-team multipliers redefine SaaS economics"**

From the elite engineering culture study: AI-native teams operate at ~25% headcount of traditional teams. Case study: 35-50 person team -> 8-14 people, 6x throughput, $2.5M annual savings. Top lean AI startups average $3.48M revenue per employee vs traditional SaaS at $610K (5.7x gap). Frame for Roxabi users: "Ship $1M ARR without a second technical hire." The agent team substitutes for headcount. The billing integration (#18) is the critical unlock to validate this claim.

### Positioning recommendation

The README and landing page should lead with the AI team, not the stack. The message: "Ship faster because you have a 9-agent AI team from day one." In the meta-app future (Zach Lloyd / Warp CEO prediction), a boilerplate that ships agent-readable infrastructure (OpenAPI CLIs, AGENTS.md guardrails, structured skills) is more durable than one that ships a pretty starter template.

### Community angle

The LinkedIn content and Sophia Antipolis event strategy signals: "0 bullshit, 100% concrete." This positioning (practical agent engineering, not AI hype) is a competitive advantage. The 50% token compression on skills is a marketable, measurable achievement. Lean into it.

---

## Key Anti-Patterns to Avoid

From production agent engineering research:

1. **Treating documentation as static** — Docs not updated after agent failures become misinformation. Each agent mistake rooted in missing context is a documentation bug. Schedule harness investment time.

2. **One-shot implementation attempts** — Agents that exhaust context mid-work produce broken partial states. Mandate incremental focus: one feature per session, commit at completion, update progress.

3. **Auto-executing irreversible actions** — `db:migrate` in bypassPermissions agents is risky. Database migrations should always require explicit human approval. Same for production deploys.

4. **Confusing the model for the system** — Prompt refinement gets diminishing returns. Adding tools, constraints, linters, and structural tests gets compounding returns.

5. **Logging as a proxy for observability** — Agent telemetry to external services creates data egress and privacy issues. Private-by-design: local audit trails, no external transit for agent session data.

6. **bypassPermissions + .env exposure** — Agents running with full filesystem access can read credentials. Short-term: ensure .env never staged. Long-term: strip credentials from agent environments entirely.

7. **No background task pattern** — The CRON skill pattern (melvynxdev) enables 10+ simultaneous agents without blocking. Currently Roxabi uses sequential `/dev` phases. For heavy orchestration, consider background task scheduling.

---

## References

### Agent Engineering & Production Patterns

- [Ashpreet Bedi — The 7 Sins of Agentic Software](https://x.com/ashpreetbedi/status/2026708881972535724)
- [Ashpreet Bedi — Agent Engineering 101](https://www.ashpreetbedi.com/articles/agent-engineering)
- [Browser Use — How We Built Secure, Scalable Agent Sandbox Infrastructure](https://browser-use.com/posts/two-ways-to-sandbox-agents)
- [Anthropic — Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic — Programmatic Tool Calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)
- [Anthropic — Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use)
- [Charlie Guo — The Emerging Harness Engineering Playbook](https://www.ignorance.ai/p/the-emerging-harness-engineering)
- [Martin Fowler — Harness Engineering](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html)
- [DecapodLabs/decapod — Control Plane for AI Code Agents](https://github.com/DecapodLabs/decapod)
- [aeitroc/Droid-CLI-Orchestrator](https://github.com/aeitroc/Droid-CLI-Orchestrator)
- [vas (ex-Meta) — AI Agents 101](https://x.com/vasuman/status/2011923440769659132)
- [Lance Martin — Programmatic Tool Calling in Claude 4.6](https://x.com/rlancemartin/status/2027450018513490419)
- [OpenAI — Harness Engineering](https://openai.com/index/harness-engineering/)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Ramp — Why We Built Our Own Background Agent (Inspect)](https://builders.ramp.com/post/why-we-built-our-background-agent)
- [10 Engineering Principles for Production-Grade AI Agents](https://x.com/rohit4verse/status/2022709729450201391)

### Claude Code Ecosystem — Skills, Plugins, Configs

- [andrew-yangy/agent-conductor — Multi-Session Dashboard](https://github.com/andrew-yangy/agent-conductor)
- [affaan-m/everything-claude-code — Battle-Tested Configs + AgentShield](https://github.com/affaan-m/everything-claude-code)
- [mgechev/skills-best-practices — Skills Guide](https://github.com/mgechev/skills-best-practices)
- [alexknowshtml/api2cli — API to CLI to Skill](https://github.com/alexknowshtml/api2cli)
- [anthropics/knowledge-work-plugins — Domain Plugin Architecture](https://github.com/anthropics/knowledge-work-plugins)
- [Claude Code Memory Documentation](https://code.claude.com/docs/en/memory)
- [Claude Code Headless / Programmatic Usage](https://code.claude.com/docs/en/headless)
- [OpenClaw Memory & Amnesia Fix Discussion](https://github.com/openclaw/openclaw/discussions/26545)
- [OpenClaw Implementation Prompts (11 specs)](https://gist.github.com/mberman84/065631c62d6d8f30ecb14748c00fc6d9)
- [Knowledge Vault Skills (Obsidian+Claude)](https://gist.github.com/naushadzaman/164e85ec3557dc70392249e548b423e9)
- [Matthew Berman — OpenClaw as Business OS](https://x.com/MatthewBerman/status/2026450191759585776)
- [Nav Toor — Tier List of 21 Claude Cowork Plugins](https://x.com/heynavtoor/status/2027054100807106829)
- [Nityesh — Claude Code Auto-Memory System Prompt](https://x.com/nityeshaga/status/2027408845023391873)
- [bcherny — Level Up Your Prompting (Claude Code Tips)](https://x.com/bcherny/status/2017742752566632544)
- [dhasandev — Wrapping Claude CLI for Agentic Apps](https://x.com/dhasandev/status/2009529865511555506)
- [Melvyn — CRON Skill for Background Task Scheduling](https://x.com/melvynxdev/status/2017465761103810793)

### Product Strategy, SaaS Building & Engineering Culture

- [CJ Roth — Building An Elite AI Engineering Culture In 2026](https://www.cjroth.com/blog/2026-02-18-building-an-elite-engineering-culture)
- [Harshil Tomar — Million Dollar Product: 12 Rules](https://x.com/hartdrawss/status/2027270166422372763)
- [Harshil Tomar — Vibe Coding 2.0: 18 Rules to Ship MVPs Fast](https://x.com/hartdrawss/status/2026198305362083910)
- [Shubham Saboo — The Modern AI PM in the Age of Agents](https://x.com/Saboo_Shubham_/status/2008742211194913117)
- [Zach Lloyd — Death of Apps, Rise of the Meta-App](https://x.com/zachlloydtweets/status/2027480476730925116)
- [Wasim — Vibe Coding 101: 15 Concepts](https://x.com/wasimships/status/2027323057757704567)
- [Jeffrey Emanuel — Challenge Your Dev Plan with Frontier Models](https://x.com/doodlestein/status/2025645582782480827)
- [Greg Isenberg — Obsidian + Claude Code as Personal OS](https://x.com/gregisenberg/status/2026036464287412412)
- [Karpathy — CLIs Are Ideal for AI Agents](https://x.com/karpathy/status/2026360908398862478)
- [Vercel — Chat SDK](https://vercel.com/changelog/chat-sdk)
- [vibeforge1111/vibeship-spark-intelligence](https://github.com/vibeforge1111/vibeship-spark-intelligence)

### Testing & QA Innovation

- [Vercel Labs — agent-browser Autonomous Dogfooding Skill](https://skills.sh/vercel-labs/agent-browser/dogfood)
- [Stuart Chaney — Auto-Generate GIF of E2E Tests on PR](https://x.com/stuartchaney/status/2024155962676830552)
- [Chris Tate — Autonomous Dogfooding (No Test Scripts)](https://x.com/ctatedev/status/2026357704617267314)

### Design & UI

- [Nano Banana 2 — 1-Shot UI Generation](https://x.com/d4m1n/status/2027064868847689902)
- [Amir Musich — 50 Design Prompts for AI Visuals](https://x.com/amirmushich/status/2019073081881293302)
- [Sales Dashboard Dark Mode Design](https://x.com/salungprastyo/status/2026917441583067618)

### Other

- [James Bedford — How I Structure Obsidian & Claude](https://x.com/jameesy/status/2026628809424781787)
- [Hayden Bleasel — Chat SDK Open Source](https://x.com/haydenbleasel/status/2026359649499492395)
- [badlogic/pi-mono — AI Agent Toolkit](https://github.com/badlogic/pi-mono)
- [Daniel San — Comprehensive Report](https://x.com/dani_avila7/status/2027423504262451319)
- [Elvis Sun — Building a Business with OpenClaw (Day 7)](https://x.com/elvissun/status/2017783446664548551)
- [Hesamation — How ClawdBot Really Works](https://x.com/hesamation/status/2017296172050690253)
- [Khaliq Gant — Multi-Agent Orchestration Lessons](https://x.com/khaliqgant/status/2019124627860050109)
- [Reddit — ClaudeAI Discussion](https://www.reddit.com/r/ClaudeAI/s/X9GCiBZFta)
- [God of Prompt — Karpathy AI Coding Rant as System Prompt](https://x.com/godofprompt/status/2018482335130296381)
- [Gamifying Life with AI — XP Points & Dopamine Hacking](https://x.com/promptllm/status/2026763542683062317)
