# Verification Report — 2026-06-04

| Gate | Result | Evidence |
|------|--------|----------|
| `bun run lint` | **FAIL** | 22 errors, 18 warnings |
| `bun run lint:custom` | **PASS** | 0 DRIZZLE injection / 0 types-boundary violations |
| `bun run typecheck` | **FAIL** | Multiple TS errors in API test files |
| `bun run test` | **FAIL** | 118 failed tests (12 files) / 1313 passed |
| `catch {}` | **PASS** | 0 occurrences |
| `expect(true).toBe(true)` | **FAIL** | 34 occurrences |
| `localhost` (uncommented) | **FAIL** | 126 occurrences |

---

## 1. Lint — 22 errors, 18 warnings

### Errors (must fix)
| Rule | Count | Files |
|------|-------|-------|
| `noUnusedImports` | 1 | `user.service.ts` (unused `forwardRef`, `Logger`) |
| `noUnusedVariables` | 5 | `auth.controller.test.ts`, `deletedOrgRestriction.service.ts` (unused import), `drizzle.provider.test.ts`, `tenant.interceptor.test.ts`, `drizzleUser.repository.test.ts` |
| `organizeImports` | 1 | `user.service.ts` |
| `format` | 11+ | `drizzleTenant.repository.ts`, `deletedOrgRestriction.service.ts`, `tenant.repository.ts`, `drizzleUser.repository.test.ts` (multiple), `tenant.interceptor.test.ts`, `drizzleUserPurge.repository.test.ts` |

### Warnings (should fix)
| Rule | Count | Files |
|------|-------|-------|
| `noExcessiveLinesPerFunction` | 2 | `auth.instance.ts` (56 lines), `customThrottler.guard.ts` (82 lines) |
| `noNonNullAssertion` | 8 | `throttler.module.ts` (8x `config.get<number>(...)!`) |

---

## 2. Lint:custom — PASS

- No DRIZZLE injection violations
- No `@repo/types` import boundary violations

---

## 3. Typecheck — FAIL

All errors are in `apps/api/src/**/*.test.ts` files. Root cause: test stubs/mock signatures drifted from source.

| File | Error pattern | Count |
|------|---------------|-------|
| `tenant.interceptor.test.ts` | `Expected 5 arguments, but got 3` | 9 |
| `drizzleUser.repository.test.ts` | `Property 'X' does not exist on type 'DrizzleUserRepository'` | 10 (`getOwnedOrganizations`, `deleteUserSessions`, `verifyOrgOwnership`, `verifyTargetMember`, `transferOrgOwnership`, `softDeleteOrg`, `clearOrgSessions`, `expireOrgInvitations`) |
| `user.service.test.ts` | `Expected 4 arguments, but got 3` + missing repo methods | 15+ |
| `drizzleUserPurge.repository.test.ts` | `Expected 5 arguments, but got 3` | 1 |

---

## 4. Test — FAIL (118 failures)

| Package | Failed files | Failed tests | Status |
|---------|-------------|--------------|--------|
| `@repo/email` | 0 | 0 | PASS (30/30) |
| `@repo/ui` | 0 | 0 | PASS (90/90) |
| `@repo/web` | 0 | 0 | PASS (N/A — runner killed by @repo/api failure) |
| `@repo/api` | 12 | 118 | FAIL |

### `@repo/api` failure clusters
| File | Failures | Root cause |
|------|----------|------------|
| `env.validation.test.ts` | 52 | Validation logic drift — defaults/secrets/CORS_ORIGIN/BETTER_AUTH_URL behavior changed |
| `drizzleUser.repository.test.ts` | 10 | Tests call methods removed from repository |
| `user.service.test.ts` | 15+ | Wrong constructor arg count + missing repo methods |
| `tenant.interceptor.test.ts` | 9 | Wrong arg count for constructor/interceptor call |
| `drizzleUserPurge.repository.test.ts` | 1 | `db.delete` call count mismatch (7 expected, 4 actual) |
| Other files | ~30 | Similar signature/behavior drift |

---

## 5. Security / Quality Smells

### `catch {}` — PASS
- 0 bare catch blocks in `apps/api/src` and `apps/web/src`

### `expect(true).toBe(true)` — FAIL
- 34 occurrences (all tautological)
- `apps/api/src/rbac/__tests__/rbac.integration.spec.ts` — 17
- `apps/api/src/auth/__tests__/auth.integration.spec.ts` — 17

These tests pass regardless of implementation and provide zero coverage.

### `localhost` (uncommented) — FAIL
- 126 occurrences
- **Source files** (not tests):
  - `apps/api/src/index.ts:76` — CORS_ORIGIN default `http://localhost:3000`
  - `apps/api/src/index.ts:193` — logger message `http://localhost:${port}`
- **Test files** (expected/acceptable if documented):
  - `cors.test.ts`, `env.validation.test.ts`, `drizzle.provider.test.ts`, `auth.controller.test.ts`, `rbac.integration.spec.ts`, `auth.integration.spec.ts`, etc.

---

## Verdict

**7 gates total: 2 PASS, 5 FAIL**

Merge blocked. Required fixes:
1. Fix or suppress 22 lint errors (unused imports/variables, format)
2. Fix 8 non-null assertions in `throttler.module.ts` (or suppress with justification)
3. Fix type errors in test files (update signatures to match source)
4. Fix test failures (update env validation tests, remove tests for removed methods, fix arg counts)
5. Replace/remove 34 `expect(true).toBe(true)` tautologies
6. Document or remove 126 uncommented `localhost` references (at minimum the 2 in source files)
