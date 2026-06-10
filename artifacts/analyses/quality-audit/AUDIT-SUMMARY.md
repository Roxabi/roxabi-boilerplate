# roxabi-boilerplate Quality Audit Summary

**Date:** 2026-06-04
**Scope:** 8 partitions (P1-P8) across 9 quality domains
**Files audited:** ~3,650 (with overlap across domains)
**Total findings:** 916

---

## 1. Executive Summary

Overall health: **Moderate to high risk**. The codebase has clean structural boundaries (zero `@repo/types` import violations, zero typecheck errors) but suffers from significant tenant-isolation gaps, unhandled async patterns, and pervasive error-swallowing in the frontend. The backend shows god-repository anti-patterns and several hardcoded fallbacks that break in non-localhost deployments.

### Top 3 Risks

1. **Tenant isolation breach in API key lookup** (`findCandidatesByLastFour`) — returns key metadata across all tenants without scoping, enabling cross-tenant enumeration.
2. **Unawaited async hook in organization creation** — `onOrganizationCreated` is fire-and-forget inside a Better Auth hook, causing race conditions and unhandled rejections.
3. **RBAC repository methods rely solely on PostgreSQL RLS** — no explicit `tenantId` WHERE clauses; defense collapses if RLS is misconfigured.

### Debt Score: **52 / 100**

**Justification:**
- Base score: 100
- Deductions: P0 (10 × 2.0) = 20; P1 (164 × 0.08) = 13.1; P2 (401 × 0.03) = 12.0; P3 (336 × 0.008) = 2.7
- Total deduction: 47.8
- Score: 100 − 47.8 = **52.2**

---

## 2. Critical Issues (P0)

| # | File | Line | Issue | Recommended Fix |
|---|------|------|-------|-----------------|
| 1 | `apps/api/src/rbac/rbac.controller.ts` | 12 | `PERMISSION_FORMAT` regex rejects underscores, breaking valid default permissions (`api_keys:read`) | Unify regex with API key regex: `^[a-z][a-z_-]*:[a-z][a-z_-]*$` |
| 2 | `apps/api/src/auth/auth.instance.ts` | 241-246 | `afterCreateOrganization` hook calls `onOrganizationCreated` without `await` — floating promise + race condition | Add `await` before `onOrganizationCreated(...)` |
| 3 | `apps/api/src/api-key/repositories/drizzleApiKey.repository.ts` | 88-106 | `findCandidatesByLastFour` has no `tenantId` filter; returns `keyHash`/`keySalt` across all tenants | Add `tenantId` filter or embed tenant prefix in token format |
| 4 | `apps/api/src/admin/exceptions/superadminProtection.exception.ts` | 3 | Exception not registered in any `@Catch` filter; falls through as HTTP 500 instead of 403 | Add to `AdminBadRequestFilter` or create `AdminForbiddenFilter` |
| 5 | `apps/api/src/admin/exceptions/notDeleted.exception.ts` | 3 | Exception not registered in any `@Catch` filter; falls through as HTTP 500 instead of 400 | Add to `AdminBadRequestFilter` |
| 6 | `apps/api/src/auth/__tests__/auth.integration.spec.ts` | 47 | Critical tautology test: `expect(true).toBe(true)` always passes | Replace with actual assertions on `_hasValidateToken` / `_hasHashPassword` |
| 7 | `apps/web/src/routes/admin/members.test.tsx` | 259-1024 | No cross-org tenant isolation tests | Add test verifying user cannot fetch members of `org-2` |
| 8 | `apps/web/src/routes/admin/settings.test.tsx` | 90-314 | No tenant isolation tests for org update/delete | Add test verifying UI blocks modifying a different org |
| 9 | `apps/web/src/routes/dashboard.test.tsx` | 82-237 | No tenant isolation tests for auto-org-selection | Add test verifying selected org matches membership list |
| 10 | `apps/web/src/routes/settings/api-keys.test.ts` | 63-277 | No tenant isolation tests for API key list/create/revoke | Add test verifying keys from one tenant are inaccessible to another |

---

## 3. High Priority (P1)

| # | File | Line | Issue | Recommended Fix |
|---|------|------|-------|-----------------|
| 1 | `apps/api/src/rbac/rbacMember.service.ts` | 69-106 | `changeMemberRole` allows promoting any member to `owner` without restriction | Add guard: reject unless current actor is existing owner |
| 2 | `apps/api/src/rbac/repositories/drizzleRbac.repository.ts` | 48, 54, 68, 83, 107, 142 | 6 RBAC methods lack explicit `tenantId` WHERE clauses; rely solely on RLS | Add `tenantId` as required parameter to all role-scoped repo methods |
| 3 | `apps/api/src/admin/adminUsers.lifecycle.ts` | 38-88 | `banExpires` is never checked at authentication time; banned users remain fully authenticated | Check `banExpires` against `Date.now()` in `AuthGuard` |
| 4 | `apps/api/src/api-key/repositories/drizzleApiKey.repository.ts` | 83-86, 108-111 | `markRevoked` / `touchLastUsedAt` update by `id` only with no `tenantId` filter | Accept and filter by `tenantId` in both methods |
| 5 | `apps/api/src/user/user.service.ts` | 173 | Cache invalidation called inside transaction callback; stale cache if rollback | Move `invalidateSoftDeleteCache` outside the transaction |
| 6 | `apps/api/src/user/user.repository.ts` | 66-91 | `UserRepository` interface defines 6 org-specific methods; god-repository | Extract org methods into `OrgRepository` or `MembershipRepository` |
| 7 | `apps/api/src/gdpr/gdpr.service.ts` | 73 | `GdprService` directly injects `DRIZZLE` and queries 7 tables inline | Create dedicated repositories and inject them |
| 8 | `apps/api/src/purge/purge.service.ts` | 13 | `PurgeService` directly injects `DRIZZLE`; only user anonymization delegated to repo | Create `OrganizationPurgeRepository` and delegate all raw queries |
| 9 | `apps/api/src/queue/handlers/email.handler.ts` | 18-31 | Throw inside batch loop; if `batchSize > 1`, pg-boss retries entire batch causing duplicate sends | Collect per-job outcomes; do not throw mid-batch |
| 10 | `apps/api/src/tenant/tenant.interceptor.ts` | 118-124 | `resolveParentOrg` catches non-Forbidden errors and silently returns `orgId`, bypassing deleted-org check | Throw `TenantResolutionException` instead of returning `orgId` |
| 11 | `apps/api/src/api-key/apiKey.service.ts` | 67 | `ApiKeyInsertFailedException` thrown but not caught by `ApiKeyExceptionFilter` | Append exception to `@Catch(...)` list in filter |
| 12 | `apps/api/src/auth/auth.instance.ts` | 66-100, 102-137, 146-181, 189-225 | Email render block duplicated 4 times | Extract shared `sendTemplatedEmail` helper |
| 13 | `apps/web/src/lib/authClient.ts` | 5 | Hardcoded `http://localhost:3000` fallback for SSR | Read `APP_URL` from env or throw at build time |
| 14 | `apps/web/src/lib/routePermissions.ts` | 67 | Hardcoded `http://localhost` fallback in `getServerEnrichedSession` | Use validated `env.API_URL` |
| 15 | `apps/web/src/components/settings/PrivacyDataSection.tsx` | 33 | GDPR export error silently swallowed | Add `toast.error()` and `console.error` in catch block |
| 16 | `apps/web/src/lib/useOrganizations.ts` | 26 | `fetchOrganizations` returns `[]` on non-ok; masks API failures | Throw on non-ok so `useQuery` error state is populated |
| 17 | `apps/web/src/routes/admin/members.tsx` | 69-72 | `fetchRoles` returns `[]` on non-ok; invite dialog shows empty select | Throw on non-ok response |
| 18 | `apps/web/src/components/admin/PendingInvitations.tsx` | 44-52 | `fetchInvitations` returns `[]` on non-ok; error UI never triggered | Throw on non-ok response |
| 19 | `apps/api/src/auth/auth.service.ts` | 40 | Hardcoded `http://localhost:4000` fallback for `BETTER_AUTH_URL` | Use `config.getOrThrow` so missing env fails fast |
| 20 | `apps/api/src/auth/auth.service.ts` | 41 | Hardcoded `http://localhost:3000` fallback for `APP_URL` | Use `config.getOrThrow` |

---

## 4. Medium Priority (P2)

| # | File | Line | Issue | Recommended Fix |
|---|------|------|-------|-----------------|
| 1 | `apps/api/src/auth/auth.controller.ts` | 26-28 | `@All('api/auth/*')` with `@AllowAnonymous()` bypasses NestJS guard stack | Document bypass; add lightweight interceptor for logging |
| 2 | `apps/api/src/rbac/permission.service.ts` | 17 | `PermissionService` injects `DRIZZLE` directly with RLS-BYPASS comment | Add lint rule or wrapper enforcing explicit `userId` + `organizationId` filters |
| 3 | `apps/api/src/queue/queue.service.ts` | 26 | Uses `DATABASE_URL` instead of `DATABASE_APP_URL`; bypasses RLS-enforced role | Prefer `DATABASE_APP_URL`; add comment if owner role is required |
| 4 | `apps/api/src/database/schema/auth.schema.ts` | 119 | `members` table lacks `deletedAt`; soft-deleted users remain active in orgs | Add `deletedAt` column and update queries |
| 5 | `apps/api/src/database/schema/auth.schema.ts` | 16 | `users` table lacks `tenantId`; RLS policy cannot be applied to auth tables | Add `tenantId` to auth tables or apply RLS policy via migration |
| 6 | `apps/api/src/admin/adminMembers.service.ts` | 228-247 | `removeMember` reads owner count then deletes outside transaction | Wrap in `db.transaction` to eliminate TOCTOU race |
| 7 | `apps/api/src/admin/adminOrganizations.service.ts` | 148-179 | `createOrganization` checks depth then inserts outside transaction | Wrap in `db.transaction` |
| 8 | `apps/api/src/consent/consent.controller.ts` | 64 | `reply.setCookie()` before `await saveConsent()`; DB/cookie mismatch on failure | Move cookie after DB write succeeds |
| 9 | `apps/api/src/admin/adminAuditLogs.service.ts` | 79-86 | `resourceId` is `text` column; `ilike` search on UUID causes false positives | Change to UUID type or add exact-match branch for UUID pattern |
| 10 | `apps/api/src/admin/adminAuditLogs.service.ts` | 79-86 | Audit log fire-and-forget errors silently swallowed | Convert to retry queue or outbox pattern |
| 11 | `apps/web/src/routes/settings/api-keys/-hooks.ts` | 8-45 | `useApiKeys` uses raw `useEffect` + `fetch` instead of TanStack Query | Migrate to `useQuery` + `useMutation` with query keys |
| 12 | `apps/web/src/routes/settings/-account-delete.tsx` | 140-181 | `fetchOwnedOrgsForUser` contains complex business logic in route file | Move to API layer or dedicated service |
| 13 | `apps/api/src/user/repositories/drizzleUserPurge.repository.ts` | 85-102 | Sequential N+1 loop for per-org anonymization | Batch with `inArray()` or SQL-level random slug generation |
| 14 | `apps/api/src/email/nodemailer.provider.ts` | 21 | `ignoreTLS: !secure` disables TLS when `SMTP_SECURE=false` | Change to `ignoreTLS: false` and require explicit TLS in prod |
| 15 | `apps/api/src/v1/filters/v1Exception.filter.ts` | 28-58 | Catches all exceptions but never logs them; 500s go unlogged | Inject `Logger` and log 5xx errors, or delegate to global filter |
| 16 | `apps/api/src/database/database.module.ts` | 106 | Bare `catch` in `checkPendingMigrations` swallows non-missing-table errors | Inspect error; log at `error` level if not "relation does not exist" |
| 17 | `apps/api/src/admin/adminOrganizations.hierarchy.ts` | 93-110 | `getSubtreeDepth` recursively queries children in a loop (N+1) | Replace with single recursive PostgreSQL CTE |
| 18 | `apps/api/src/admin/adminOrganizations.hierarchy.ts` | 115-129 | `getDescendantOrgIds` recursively queries grandchildren in a loop (N+1) | Replace with single recursive CTE |
| 19 | `apps/api/src/system-settings/systemSettings.service.ts` | 36-58 | `batchUpdate` performs sequential reads then writes without transaction | Wrap in `db.transaction` |
| 20 | `apps/api/src/admin/adminOrganizations.hierarchy.ts` | 44-51 | `validateHierarchy` uses outer `db` instead of `tx` for `getSubtreeDepth` | Pass `tx` to `getSubtreeDepth` |

---

## 5. Low Priority (P3)

| # | File | Line | Issue | Recommended Fix |
|---|------|------|-------|-----------------|
| 1 | `apps/api/src/api-key/apiKey.service.ts` | 182-186 | `timingSafeEqual(dummy, dummy)` is a no-op; does not simulate real hash comparison | Compare against a synthetic random hash instead |
| 2 | `apps/api/src/auth/auth.instance.ts` | 25 | Direct `process.env.APP_NAME` read; bypasses `ConfigService` | Use `configService.get('APP_NAME')` |
| 3 | `apps/api/src/user/user.controller.ts` | 123 | Hardcoded cookie name `better-auth.session_token` | Extract to shared constant from auth module |
| 4 | `apps/api/src/gdpr/gdpr.controller.ts` | 25 | Direct `process.env.APP_NAME` instead of injected `ConfigService` | Use `configService.get('APP_NAME')` |
| 5 | `apps/api/src/throttler/filters/throttlerException.filter.ts` | 52-56 | Logs rate limit tracker (IP/user ID) and request path | Log only tier name and correlation ID |
| 6 | `apps/api/src/common/filters/allExceptions.filter.ts` | 92-98 | Logs full stack traces for 500 errors in production | Log only message in production; keep stack in dev |
| 7 | `apps/api/src/admin/adminSettings.controller.ts` | 74-99 | `batchUpdate` accepts `z.unknown()` for setting values; no structural validation | Add per-setting JSON schema validation |
| 8 | `packages/ui/src/index.ts` | 1-203 | God-module barrel file: exports 47+ components/theme/utilities | Split into subpath exports or document as intentional |
| 9 | `packages/types/src/shared/index.ts` | 1-16 | `httpError.ts`, `audit.ts`, `avatar.ts`, `consent.ts` are domain-specific but live in `shared/` | Move to `api/` or `ui/` subpaths; complete Slice 6 migration |
| 10 | `packages/cli/src/commands/*.ts` | various | All 6 list commands redefine local interfaces instead of using `@repo/types/api` | Add `@repo/types` dependency and consume generated types |

---

## 6. Tenant Isolation & Boundary Summary

### Tenant Isolation Findings

| Finding | Severity | Domain | File |
|---------|----------|--------|------|
| `findCandidatesByLastFour` returns API key metadata across all tenants | P0 | Security | `apps/api/src/api-key/repositories/drizzleApiKey.repository.ts` |
| `members` table lacks `deletedAt`; soft-deleted users remain in orgs | P1 | Security | `apps/api/src/database/schema/auth.schema.ts` |
| `users` and auth tables lack `tenantId`; RLS policy cannot be applied | P1 | Security | `apps/api/src/database/schema/auth.schema.ts` |
| RLS policy `create_tenant_rls_policy` defined in migration but never called | P1 | Security | `apps/api/drizzle/migrations/0000_baseline.sql` |
| `markRevoked` / `touchLastUsedAt` lack `tenantId` filter | P1 | Security | `apps/api/src/api-key/repositories/drizzleApiKey.repository.ts` |
| 6 RBAC repo methods rely solely on RLS without explicit `tenantId` | P1 | Security | `apps/api/src/rbac/repositories/drizzleRbac.repository.ts` |
| `PermissionService` injects `DRIZZLE` directly (RLS-BYPASS) | P2 | Security | `apps/api/src/rbac/permission.service.ts` |
| `QueueService` uses `DATABASE_URL` instead of `DATABASE_APP_URL` | P2 | Security | `apps/api/src/queue/queue.service.ts` |
| `DrizzleUserPurgeRepository` deletes `roles` via raw `qb` bypassing `TenantService.queryAs` | P2 | Security | `apps/api/src/user/repositories/drizzleUserPurge.repository.ts` |
| `consent_records` table has no `organizationId` or tenant scoping | P2 | Architecture | `apps/api/src/consent/consent.schema.ts` |
| No tenant isolation tests in web tests (members, settings, dashboard, api-keys) | P0 | Test | 4 test files |
| `TenantInterceptor` silent fallbacks bypass deleted-org check | P1 | Error | `apps/api/src/tenant/tenant.interceptor.ts` |

### @repo/types Boundary Findings

| Finding | Severity | File |
|---------|----------|------|
| `lint:custom` and `typecheck` pass with **0 violations** | Clean | — |
| `httpError.ts`, `audit.ts` are API-specific but live in `types/shared/` | P3 | `packages/types/src/shared/index.ts` |
| `avatar.ts`, `consent.ts` are UI-specific but live in `types/shared/` | P3 | `packages/types/src/shared/index.ts` |
| `DICEBEAR_CDN_DOMAIN` / `AVATAR_STYLES` leak into API controller | P2 | `apps/api/src/user/user.controller.ts` |
| `SENSITIVE_FIELDS` runtime constant imported from `@repo/types` in frontend | P3 | `apps/web/src/components/admin/DiffViewer.tsx` |
| `DICEBEAR_CDN_BASE` runtime constant imported from `@repo/types` in frontend | P3 | `apps/web/src/lib/avatar/buildDiceBearUrl.ts` |
| `AVATAR_STYLES` runtime constant imported from `@repo/types` in frontend | P3 | `apps/web/src/lib/avatar/helpers.ts` |
| CLI redefines `ApiError`, `RoleResponse`, `UserMeResponse`, etc. instead of using `@repo/types/api` | P2 | `packages/cli/src/lib/client.ts`, `commands/*.ts` |

---

## 7. Metrics Dashboard

| Domain | Total | P0 | P1 | P2 | P3 |
|--------|-------|----|----|----|----|
| Architecture | 94 | 0 | 10 | 49 | 26 |
| Security | 54 | 1 | 8 | 18 | 27 |
| Code Smells | 101 | 1 | 17 | 54 | 29 |
| Async Patterns | 40 | 1 | 2 | 24 | 13 |
| Error Handling | 161 | 2 | 14 | 92 | 53 |
| Test Quality | 113 | 5 | 66 | 15 | 30 |
| Tech Debt | 123 | 0 | 24 | 63 | 36 |
| Type Safety | 230 | 0 | 23 | 86 | 122 |
| Structural / Boundaries | 0 | 0 | 0 | 0 | 0 |
| **Total** | **916** | **10** | **164** | **401** | **336** |

### Missing Reports

The following expected audit reports were **not found** in `artifacts/analyses/quality-audit/`:

- `architecture/P1.md` (AuthN/AuthZ partition)
- `code-smells/P3.md` (Admin partition)
- `code-smells/P4.md` (Consent/GDPR partition)
- `error-handling/P4.md` (Consent/GDPR partition)

These partitions were still audited in other domains (security, async-patterns, type-safety, etc.), but the specific reports above are absent.

---

## 8. Debt Score

**Score: 52 / 100**

**Formula:**
- Start: 100
- P0: −2.0 points each (10 items) = −20.0
- P1: −0.08 points each (164 items) = −13.1
- P2: −0.03 points each (401 items) = −12.0
- P3: −0.008 points each (336 items) = −2.7

**Rationale:**
- **10 P0** is a high density of critical issues (runtime correctness, tenant isolation, test tautologies). The 5 test-only P0s are less urgent than the 3 runtime P0s but still indicate dangerous blind spots.
- **164 P1** is elevated; the majority are missing tenant scoping, missing return types, and hardcoded fallbacks that break in production.
- **401 P2** shows systemic DRY violations, N+1 queries, and swallowed errors across both frontend and backend.
- **336 P3** is large but largely cosmetic (magic numbers, stale comments, generic throws). The low weight prevents them from dominating the score.
- Structural boundaries and typecheck are fully clean, which prevents the score from dropping below 50.

---

## 9. Top 10 Quick Wins

Low effort, high impact fixes that can be done in a single session.

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | Fix `PERMISSION_FORMAT` regex to allow underscores | 30 min | Unblocks valid API key permissions |
| 2 | Await `onOrganizationCreated` in auth hook | 5 min | Eliminates race condition + unhandled rejection |
| 3 | Register `SuperadminProtectionException` and `NotDeletedException` in admin filters | 30 min | Corrects HTTP 500 → 4xx mapping |
| 4 | Add `credentials: 'include'` to `UserActions.tsx` and `OrgActions.tsx` | 5 min | Prevents auth breakage on API origin changes |
| 5 | Remove dead `ApiKeyExpiredException` / `ApiKeyRevokedException` classes | 5 min | Cleanup + reduces confusion |
| 6 | Hoist `allPerms` query outside loop in `seedDefaultRoles` | 10 min | Removes N+1 query in RBAC seeding |
| 7 | Replace `window.location.reload()` / `window.location.href` with TanStack Router `navigate()` in 4 routes | 30 min | Fixes SPA navigation, avoids full reloads |
| 8 | Remove `console.error` leaks from production UI (account-delete, account-credentials) | 10 min | Security hygiene |
| 9 | Add `api_keys.last_four` database index | 15 min | Scales API key validation |
| 10 | Make `fetchRoles`, `fetchInvitations`, and `useOrganizations` throw on non-ok response | 15 min | Surfaces API errors to users instead of empty states |

---

## 10. Recommended Actions

### Phase 1: Critical (Week 1)
- Fix all 10 P0 issues — 3 are runtime-critical, 2 are exception filter misconfigurations, 5 are test gaps.
- Fix P1 security issues: add `tenantId` scoping to API key and RBAC mutations; add `banExpires` check in `AuthGuard`.
- Add exception filters for missing domain exceptions (`SuperadminProtectionException`, `NotDeletedException`).
- Fix hardcoded localhost fallbacks in auth service, auth controller, and SSR paths to use `config.getOrThrow` or env-driven values.

### Phase 2: Architecture & Patterns (Week 2–3)
- Extract org-specific methods from `UserRepository` into `OrgRepository` / `MembershipRepository`.
- Extract GDPR and purge services to use repositories instead of raw `DRIZZLE`.
- Create a shared admin API client (`lib/admin/api.ts`) to eliminate 40+ duplicated inline `fetch` calls.
- Migrate `useApiKeys` from raw `useEffect` + `fetch` to TanStack Query.
- Break circular dependency between `admin` and `feature-flags` by moving `FeatureFlagCreateFailedException`.
- Replace `window.location` mutations with router navigation across the web app.

### Phase 3: Type Safety & DRY (Week 4)
- Add Zod / Valibot validation to all `res.json()` casts in frontend admin routes and API clients.
- Add explicit return types to all public controller and service methods (estimated 120+ functions).
- Replace `as` casts in `nestjs-cls` getters with runtime validation or typed wrappers.
- Consolidate duplicated admin components (`BanDialog`, `ImpactSummary`, `ProfileField`, `TableSkeleton`).
- Extract shared query key factories for `admin-members` and `org-roles` (resolve TODOs in `members.tsx`).

### Phase 4: Test Coverage & Reliability (Ongoing)
- Add tenant isolation tests to web and API test suites.
- Replace `expect(true).toBe(true)` tautologies in integration tests with `fail()` or real assertions.
- Replace module-level `vi.mock` with scoped spies or inline mocks.
- Add e2e coverage for billing, RBAC enforcement, and cross-tenant data leakage.
- Fix `globalThis.fetch` teardown in all web tests that mutate it.
