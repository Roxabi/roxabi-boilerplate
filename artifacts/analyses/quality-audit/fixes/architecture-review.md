# Architecture Review Report — Phase 3 Corrections

**Status:** FAIL (1 of 5 criteria failed)

**Date:** 2026-06-04
**Reviewer:** architect agent
**Scope:** Phase 3 Architecture corrections per `docs/workflows/fix-audit-findings.js`

---

## Criteria

### 1. UserRepository no longer touches org/member/invitation/session tables
**Status:** PASS

**Evidence:**
- `apps/api/src/user/user.repository.ts` (interface) — defines `UserProfile`, `getSoftDeleteStatus`, `getProfile`, `getNameFields`, `updateProfile`, `findForValidation`, `softDeleteUser`, `reactivateUser`, `transaction`. No org/member/invitation/session methods.
- `apps/api/src/user/repositories/drizzleUser.repository.ts` (implementation) — queries only the `users` table (`schema/auth.schema.js`). No references to `organizations`, `members`, `invitations`, or `sessions`.
- `DrizzleUserPurgeRepository` (`userPurge.repository.ts`) does touch those tables, but it is a separate repository interface (`UserPurgeRepository`), not `UserRepository`.

---

### 2. TenantInterceptor uses TenantRepository, not raw Drizzle
**Status:** PASS (with observation)

**Evidence:**
- `TenantInterceptor` injects `TENANT_REPO` (`tenant.repository.ts`) and calls `this.tenantRepo.lookupOrganization(orgId)` at line 97 for the actual tenant lookup.
- It retains an `@Optional() @Inject(DRIZZLE)` fallback at line 42, annotated with `// RLS-BYPASS: tenant resolution — fallback when repository is unavailable`. This is used only for a null-check guard (`if (!this.db)`) and is listed in the allowed bypass paths in `scripts/lint/checkDrizzleInjection.ts` (line 15).
- The primary data access path is through `TenantRepository`; raw Drizzle is present only as a defensive fallback for bootstrap scenarios.

---

### 3. DICEBEAR_CDN_DOMAIN removed from API controller
**Status:** PASS (with observation)

**Evidence:**
- `apps/api/src/user/user.controller.ts` — no references to `DICEBEAR_CDN_DOMAIN`, `AVATAR_STYLES`, or DICEBEAR URL construction. The `updateProfileSchema` no longer constrains `image` to a DICEBEAR prefix.
- **Observation:** `apps/api/src/user/user.controller.test.ts` still imports `DICEBEAR_CDN_DOMAIN` and `AVATAR_STYLES` from `@repo/types` (line 1) and reconstructs a schema that uses `DICEBEAR_URL_PREFIX` and `avatarStyle: z.enum(AVATAR_STYLES)` (lines 11, 18, 23). The test was not updated to match the relaxed controller schema. This is a test debt item, not a controller violation.

---

### 4. sendTemplatedEmail helper exists and is used
**Status:** PASS

**Evidence:**
- Helper exists at `apps/api/src/auth/helpers/sendTemplatedEmail.ts` (lines 30-47). It accepts `queueService`, `to`, `emailContent`, `logger`, `errorMessage`, and `throwOnFailure`.
- Used in `apps/api/src/auth/auth.instance.ts` at 4 call sites:
  - `onExistingUserSignUp` (line 97)
  - `sendResetPassword` (line 131)
  - `sendVerificationEmail` (line 174)
  - `sendMagicLink` (line 220)
- Each call is preceded by `renderEmailTemplate` for fallback rendering.

---

### 5. checkRepositoryBoundaries lint rule exists
**Status:** FAIL

**Evidence:**
- `scripts/lint/` contains only `checkDrizzleInjection.ts` and `checkTypeImports.ts`.
- `package.json` `"lint:custom"` runs only those two scripts:
  ```json
  "lint:custom": "bun run scripts/lint/checkDrizzleInjection.ts && bun run scripts/lint/checkTypeImports.ts"
  ```
- No `checkRepositoryBoundaries.ts` file exists anywhere in `scripts/lint/` or the repo.
- The Phase 3 spec (`docs/workflows/fix-audit-findings.js` line 243) explicitly requires:
  > 7. Create checkRepositoryBoundaries.ts lint rule
- The deliverable was not implemented.

**Impact:** Without this rule, repository boundary violations (e.g., a service directly importing a Drizzle schema table that belongs to another bounded context) will not be caught at lint time.

---

## Summary

| # | Criterion | Status |
|---|-----------|--------|
| 1 | UserRepository no longer touches org/member/invitation/session tables | PASS |
| 2 | TenantInterceptor uses TenantRepository, not raw Drizzle | PASS |
| 3 | DICEBEAR_CDN_DOMAIN removed from API controller | PASS |
| 4 | sendTemplatedEmail helper exists and is used | PASS |
| 5 | checkRepositoryBoundaries lint rule exists | **FAIL** |

---

## Required Action

Create `scripts/lint/checkRepositoryBoundaries.ts` and wire it into `package.json` `"lint:custom"`. The rule should enforce that each repository file only imports schema tables from its own bounded context (e.g., `user/` repositories only touch `users`, `organization/` repositories only touch `organizations`, etc.).

**Files to create/modify:**
- `scripts/lint/checkRepositoryBoundaries.ts` (new)
- `package.json` — append `&& bun run scripts/lint/checkRepositoryBoundaries.ts` to `"lint:custom"`
