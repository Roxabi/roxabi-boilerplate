export const meta = {
  name: 'fix-audit-findings',
  description:
    'Multi-phase correction workflow for roxabi-boilerplate quality audit — follows dev-core F-full process (frame → spec → plan → implement → verify → ship) across 5 systemic phases',
  phases: [
    { title: 'Frame', detail: 'Root-cause analysis + scope framing for all 5 phases' },
    { title: 'Spec', detail: 'Detailed specs per phase with acceptance criteria' },
    { title: 'Plan', detail: 'Task breakdown, agent assignment, worktree setup' },
    { title: 'Implement', detail: 'Phase 1–5 corrections by domain agents' },
    { title: 'Verify', detail: 'Lint, typecheck, tests, fresh review' },
    { title: 'Ship', detail: 'PR, CI, merge, cleanup' },
  ],
}

// ═══════════════════════════════════════════════════════════════════════════════
// Dev-Core F-Full Process — 5 Systemic Correction Phases
// ═══════════════════════════════════════════════════════════════════════════════

// Each phase produces an artifact in artifacts/frames/ or artifacts/specs/
// or artifacts/plans/ for resumption and human approval gates.

// ── Phase 1: Frame ─────────────────────────────────────────────────────────────────────────────
// Reads all audit reports, identifies root causes, frames 5 correction phases.

phase('Frame')

log('Reading audit reports for framing...')

const frame = await agent(
  `
You are a product-lead + architect agent framing the correction work for the roxabi-boilerplate audit.

## Input
Read these audit reports:
- artifacts/analyses/quality-audit/AUDIT-SUMMARY.md
- artifacts/analyses/quality-audit/security/*.md
- artifacts/analyses/quality-audit/error-handling/*.md
- artifacts/analyses/quality-audit/architecture/*.md
- artifacts/analyses/quality-audit/async-patterns/*.md
- artifacts/analyses/quality-audit/tech-debt/*.md

## Task
Produce a framing document: artifacts/frames/audit-correction-frame.mdx

Structure:
1. Root Cause Analysis (5 systemic failures)
2. Correction Phases (1 per systemic failure)
   - Phase 1: Tenant Isolation (RLS activation + repository scoping)
   - Phase 2: Error Handling (structured errors + apiClient unification)
   - Phase 3: Architecture (bounded contexts + god-repo split)
   - Phase 4: Async & Transactions (await discipline + transaction boundaries)
   - Phase 5: Config & Validation (strict env + no localhost fallbacks)
3. Risk Assessment (what could break, what needs migration)
4. Decision Points (human approval required before each phase)
5. Success Criteria (how we know each phase is done)

Each phase must include:
- Scope: files affected
- Complexity: S / F-lite / F-full
- Risk level: low / medium / high
- Dependencies: which phase must complete before which
- Gate: what verification must pass
`,
  { label: 'Frame: root-cause + phases', phase: 'Frame', agentType: 'dev-core:product-lead' }
)

// ── Phase 2: Spec ───────────────────────────────────────────────────────────────────────────────
// Writes detailed specs for each phase with acceptance criteria.
// Human approval gate before proceeding.

phase('Spec')

const spec = await agent(
  `
You are a product-lead agent writing detailed specs for each correction phase.

## Input
Read the framing document: artifacts/frames/audit-correction-frame.mdx

## Task
Produce 5 spec documents:
- artifacts/specs/audit-correction-phase1.mdx (Tenant Isolation)
- artifacts/specs/audit-correction-phase2.mdx (Error Handling)
- artifacts/specs/audit-correction-phase3.mdx (Architecture)
- artifacts/specs/audit-correction-phase4.mdx (Async & Transactions)
- artifacts/specs/audit-correction-phase5.mdx (Config & Validation)

Each spec must include:
1. Problem Statement (from audit findings)
2. Solution Design (what changes, why)
3. Acceptance Criteria (testable, numbered)
4. Files to Modify (list)
5. Tests to Add/Update (list)
6. Migration Steps (if DB schema change)
7. Rollback Plan (if something breaks)

Use the audit findings as evidence. Cite exact file:line for P0/P1 issues.
`,
  { label: 'Spec: 5 phase specs', phase: 'Spec', agentType: 'dev-core:product-lead' }
)

// ── Phase 3: Plan ───────────────────────────────────────────────────────────────────────────────
// Breaks each phase into tasks, assigns agents, creates worktrees.
// Human approval gate before proceeding.

phase('Plan')

const plan = await agent(
  `
You are a product-lead + architect agent creating the implementation plan.

## Input
Read the 5 spec documents from artifacts/specs/audit-correction-phase*.mdx

## Task
Produce a plan document: artifacts/plans/audit-correction-plan.mdx

Structure:
1. Worktree Setup
   - Branch: feat/audit-correction
   - Worktree: ../roxabi-audit-correction
   - DB branch: audit-correction

2. Task List (per phase)
   - Phase 1: tenant isolation
     - T1.1: Add tenantId to auth schema tables
     - T1.2: Create RLS migration
     - T1.3: Fix findCandidatesByLastFour
     - T1.4: Fix RBAC repo methods
     - T1.5: Fix API key mutations
     - T1.6: Fix TenantInterceptor fail-closed
   - Phase 2: error handling
     - T2.1: Create apiClient with ApiError
     - T2.2: Fix backend catch blocks
     - T2.3: Fix frontend silent failures
     - T2.4: Add exception filters
   - Phase 3: architecture
     - T3.1: Extract OrgRepository
     - T3.2: Move TenantInterceptor queries to TenantRepository
     - T3.3: Extract email helper
     - T3.4: Add repository boundary lint
   - Phase 4: async
     - T4.1: Fix floating promise in auth.instance.ts
     - T4.2: Move cache invalidation outside transactions
     - T4.3: Batch N+1 queries
     - T4.4: Merge seed + owner assignment into single transaction
   - Phase 5: config
     - T5.1: Replace get with getOrThrow
     - T5.2: Add Zod env validation
     - T5.3: Remove dead code
     - T5.4: Add DB index

3. Agent Assignment
   - backend-dev: Phase 1, 4, 5 (backend tasks)
   - frontend-dev: Phase 2, 3 (frontend tasks)
   - devops: Phase 3 (lint rule)
   - tester: All phases (tests)
   - security-auditor: Phase 1 (review)
   - architect: Phase 3 (review)

4. Execution Order
   - Sequential: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
   - Rationale: Phase 1 changes DB schema, must complete first. Phase 2–5 can be parallel after.
   - Alternative: Phase 1 alone, then Phase 2–5 in parallel.

5. Verification Gates
   - After each phase: bun lint + bun typecheck + bun test
   - After all phases: full CI run
`,
  { label: 'Plan: task breakdown', phase: 'Plan', agentType: 'dev-core:architect' }
)

// ── Phase 4: Implement ──────────────────────────────────────────────────────────────────────────
// Executes corrections per phase. Sequential for Phase 1 (schema), then parallel for 2–5.

phase('Implement')

// Phase 1: Tenant Isolation (must complete first — schema changes)
log('Phase 1: Tenant Isolation — sequential execution')

const impl1 = await agent(
  `
You are a backend-dev agent implementing Phase 1: Tenant Isolation.

## Input
Read:
- artifacts/specs/audit-correction-phase1.mdx
- artifacts/analyses/quality-audit/security/P1.md
- artifacts/analyses/quality-audit/security/P2.md

## Setup
1. Create worktree: git worktree add ../roxabi-audit-correction -b feat/audit-correction staging
2. cd ../roxabi-audit-correction && cp .env.example .env && bun install
3. cd apps/api && bun run db:branch:create --force audit-correction

## Tasks
1. Fix P0: findCandidatesByLastFour — add tenantId filter
2. Fix P1: RBAC repo methods — add tenantId WHERE
3. Fix P1: API key mutations — add tenantId WHERE
4. Fix P1: changeMemberRole — add owner guard
5. Fix P1: TenantInterceptor — throw on non-Forbidden errors
6. Add migration: enable RLS on tenant-scoped tables
7. Add tenantId to auth tables or document exemption

## Gate
After changes, run: bun run lint:custom && bun run typecheck && bun run test
If any fail, fix and re-run.

## Output
Commit with: git add <files> && git commit -m "fix(api): tenant isolation — scope queries, activate RLS, fix interceptor"
Write summary to: artifacts/analyses/quality-audit/fixes/phase1-summary.md
`,
  { label: 'P1: Tenant Isolation', phase: 'Implement', agentType: 'dev-core:backend-dev' }
)

// Phase 2–5: Parallel execution
log('Phase 2–5: Parallel execution')

const [impl2, impl3, impl4, impl5] = await parallel([
  () =>
    agent(
      `
You are a backend-dev + frontend-dev agent implementing Phase 2: Error Handling.

## Input
Read artifacts/specs/audit-correction-phase2.mdx

## Tasks
1. Create unified apiClient in apps/web/src/lib/apiClient.ts (throws ApiError, never returns [] on failure)
2. Replace inline fetch in admin routes with apiClient
3. Fix backend catch blocks in auth.guard.ts, auth.instance.ts
4. Add ApiKeyInsertFailedException to ApiKeyExceptionFilter
5. Add admin exception filters (SuperadminProtectionException, NotDeletedException)
6. Fix banExpires check in AuthGuard
7. Fix frontend silent failures (useOrganizations, fetchRoles, PrivacyDataSection, fetchDeletionImpact)

## Gate
bun run lint && bun run typecheck && bun run test

## Output
Commit: git add <files> && git commit -m "fix: structured error handling — apiClient, exception filters, catch blocks"
Write summary: artifacts/analyses/quality-audit/fixes/phase2-summary.md
`,
      { label: 'P2: Error Handling', phase: 'Implement', agentType: 'dev-core:fixer' }
    ),

  () =>
    agent(
      `
You are a backend-dev + architect agent implementing Phase 3: Architecture.

## Input
Read artifacts/specs/audit-correction-phase3.mdx

## Tasks
1. Extract org-related methods from UserRepository into OrgRepository
2. Move TenantInterceptor queries to TenantRepository
3. Move enforceDeletedOrgRestriction to guard or config-driven middleware
4. Remove DICEBEAR_CDN_DOMAIN / AVATAR_STYLES from user.controller.ts
5. Extract sendTemplatedEmail helper from auth.instance.ts
6. Extract resolvePermissionIds and assertSlugAvailable helpers from rbac.service.ts
7. Create checkRepositoryBoundaries.ts lint rule

## Gate
bun run lint && bun run typecheck && bun run test

## Output
Commit: git add <files> && git commit -m "refactor: split god repositories, extract helpers, add boundary lint"
Write summary: artifacts/analyses/quality-audit/fixes/phase3-summary.md
`,
      { label: 'P3: Architecture', phase: 'Implement', agentType: 'dev-core:architect' }
    ),

  () =>
    agent(
      `
You are a backend-dev agent implementing Phase 4: Async & Transactions.

## Input
Read artifacts/specs/audit-correction-phase4.mdx

## Tasks
1. Fix P0: add await to onOrganizationCreated in auth.instance.ts
2. Fix P1: move invalidateSoftDeleteCache outside transaction in UserService.softDelete
3. Fix P2: wrap OrganizationService.reactivate in transaction
4. Fix P2: batch N+1 in DrizzleUserPurgeRepository (use inArray or Promise.all)
5. Fix P2: merge seedDefaultRoles + owner assignment into single transaction in rbac.listener.ts
6. Fix P2: hoist allPerms query outside loop in seedDefaultRoles

## Gate
bun run lint && bun run typecheck && bun run test

## Output
Commit: git add <files> && git commit -m "fix: async discipline — await callbacks, transaction boundaries, batch queries"
Write summary: artifacts/analyses/quality-audit/fixes/phase4-summary.md
`,
      { label: 'P4: Async & Transactions', phase: 'Implement', agentType: 'dev-core:backend-dev' }
    ),

  () =>
    agent(
      `
You are a backend-dev + frontend-dev agent implementing Phase 5: Config & Validation.

## Input
Read artifacts/specs/audit-correction-phase5.mdx

## Tasks
1. Replace config.get(..., 'localhost') with config.getOrThrow in auth.service.ts, auth.controller.ts
2. Replace process.env.APP_NAME with configService.get in auth.instance.ts, gdpr.controller.ts
3. Add Zod env validation schema at boot time for required vars
4. Extract session config magic numbers to named constants in auth.instance.ts
5. Add api_keys.last_four DB index
6. Remove dead exception classes (ApiKeyExpiredException, ApiKeyRevokedException)
7. Fix frontend localhost fallbacks (authClient.ts, routePermissions.ts)

## Gate
bun run lint && bun run typecheck && bun run test

## Output
Commit: git add <files> && git commit -m "chore: strict config validation — getOrThrow, env schema, remove dead code"
Write summary: artifacts/analyses/quality-audit/fixes/phase5-summary.md
`,
      { label: 'P5: Config & Validation', phase: 'Implement', agentType: 'dev-core:backend-dev' }
    ),
])

// ── Phase 5: Verify ───────────────────────────────────────────────────────────────────────────────
// Fresh review agents verify all changes.

phase('Verify')

log('Running verification gate...')

const verify = await agent(
  `
You are a tester + security-auditor agent running the verification gate.

## Tasks
1. Run bun run lint — must be zero errors
2. Run bun run lint:custom — must be zero violations
3. Run bun run typecheck — must be zero errors
4. Run bun run test — must be zero failures
5. Check remaining catch {}: grep -r "catch {}" apps/api/src apps/web/src | wc -l — must be 0
6. Check remaining tautologies: grep -r "expect(true).toBe(true)" apps/api/src apps/web/src | wc -l — must be 0
7. Check remaining localhost fallbacks: grep -r "localhost" apps/api/src apps/web/src | grep -v "// " | wc -l — must be 0 (or documented)

## Output
Write PASS/FAIL report: artifacts/analyses/quality-audit/fixes/verification-report.md
`,
  { label: 'Verification Gate', phase: 'Verify', agentType: 'dev-core:tester' }
)

// Fresh review (parallel security + architect)
const [reviewSec, reviewArch] = await parallel([
  () =>
    agent(
      `
You are a security-auditor agent reviewing the Phase 1 changes.

## Tasks
1. Verify findCandidatesByLastFour now has tenantId filter
2. Verify RBAC repo methods have tenantId WHERE
3. Verify API key mutations have tenantId WHERE
4. Verify RLS migration exists and is correct
5. Verify TenantInterceptor throws on errors (does not fall back)

## Output
Security review report: artifacts/analyses/quality-audit/fixes/security-review.md
Status: PASS / FAIL with findings
`,
      { label: 'Security Review', phase: 'Verify', agentType: 'dev-core:security-auditor' }
    ),

  () =>
    agent(
      `
You are an architect agent reviewing the Phase 3 changes.

## Tasks
1. Verify UserRepository no longer touches org/member/invitation/session tables
2. Verify TenantInterceptor uses TenantRepository, not raw Drizzle
3. Verify DICEBEAR_CDN_DOMAIN removed from API controller
4. Verify sendTemplatedEmail helper exists and is used
5. Verify checkRepositoryBoundaries lint rule exists

## Output
Architecture review report: artifacts/analyses/quality-audit/fixes/architecture-review.md
Status: PASS / FAIL with findings
`,
      { label: 'Architecture Review', phase: 'Verify', agentType: 'dev-core:architect' }
    ),
])

// ── Phase 6: Ship ───────────────────────────────────────────────────────────────────────────────
// PR creation, CI wait, merge, cleanup.

phase('Ship')

const ship = await agent(
  `
You are a devops agent handling the ship phase.

## Tasks
1. Create PR from feat/audit-correction to staging:
   gh pr create --title "fix: systemic audit corrections — tenant isolation, error handling, architecture, async, config" \\
     --body "Closes #XXX

## Summary
Multi-phase correction of quality audit findings:
- Phase 1: Tenant isolation (RLS activation, repository scoping)
- Phase 2: Error handling (structured errors, apiClient, exception filters)
- Phase 3: Architecture (bounded contexts, god-repo split)
- Phase 4: Async & transactions (await discipline, transaction boundaries)
- Phase 5: Config & validation (strict env, no localhost fallbacks)

## Verification
- [ ] lint: pass
- [ ] typecheck: pass
- [ ] test: pass
- [ ] security review: pass
- [ ] architecture review: pass
"

2. Watch CI: gh pr checks <pr-number> --watch
3. If CI passes, report: PR ready for merge
4. If CI fails, report: exact failures

## Output
Ship report: artifacts/analyses/quality-audit/fixes/ship-report.md
`,
  { label: 'Ship: PR + CI', phase: 'Ship', agentType: 'dev-core:devops' }
)

// ── Final Synthesis ─────────────────────────────────────────────────────────────────────────

log('All phases completed')

return {
  frame: frame ? 'done' : 'failed',
  spec: spec ? 'done' : 'failed',
  plan: plan ? 'done' : 'failed',
  phase1: impl1 ? 'done' : 'failed',
  phase2: impl2 ? 'done' : 'failed',
  phase3: impl3 ? 'done' : 'failed',
  phase4: impl4 ? 'done' : 'failed',
  phase5: impl5 ? 'done' : 'failed',
  verification: verify ? 'done' : 'failed',
  securityReview: reviewSec ? 'done' : 'failed',
  architectureReview: reviewArch ? 'done' : 'failed',
  ship: ship ? 'done' : 'failed',
  date: '2026-06-04',
}
