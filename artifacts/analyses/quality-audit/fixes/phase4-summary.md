# Phase 4 Summary — Async & Transactions

## Date
2026-06-04

## Scope
Async discipline, transaction boundaries, N+1 elimination, and batch-level error handling.

## Changes Made

### 1. Cache invalidation outside transaction (`user.service.ts`)
- **File:** `apps/api/src/user/user.service.ts`
- **Issue:** `invalidateSoftDeleteCache(userId)` was called inside the `repo.transaction` callback in `softDelete()`. If the transaction rolled back after that point, the cache would become stale (cache invalidated but DB state unchanged).
- **Fix:** Moved `this.invalidateSoftDeleteCache(userId)` to after the transaction commits, between the `await this.repo.transaction(...)` and the `eventEmitter.emitAsync(...)` call.

### 2. Await `invalidateQueries` in `PendingInvitations` callback
- **File:** `apps/web/src/components/admin/PendingInvitations.tsx`
- **Issue:** `queryClient.invalidateQueries({ queryKey: ['admin-invitations'] })` inside `revokeMutation.onSuccess` was a floating promise (fire-and-forget).
- **Fix:** Changed `onSuccess: () => { ... }` to `onSuccess: async () => { ... await queryClient.invalidateQueries(...) }`.

### 3. Await `invalidateQueries` in `useOrganizations` refetch
- **File:** `apps/web/src/lib/useOrganizations.ts`
- **Issue:** `queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY })` inside `useCallback` was a floating promise.
- **Fix:** Changed the callback from `() => { ... }` to `async () => { await ... }`.

## Pre-Existing Fixes (Already Applied in Worktree)

The following Phase 4 items were already resolved in the current worktree before this commit:

| Item | File | Status |
|------|------|--------|
| `await onOrganizationCreated` in `afterCreateOrganization` hook | `auth.instance.ts` | Already awaited |
| Wrap `removeMember` last-owner check + delete in transaction | `adminMembers.service.ts` | Already wrapped |
| Wrap `createOrganization` depth check + insert in transaction | `adminOrganizations.service.ts` | Already wrapped |
| Wrap `batchUpdate` in transaction | `systemSettings.service.ts` | Already wrapped |
| Wrap `reactivate` read-check-write in transaction | `organization.service.ts` | Already wrapped |
| Merge `seedDefaultRoles` + owner assignment into single transaction | `rbac.listener.ts` | Already in `tenantService.queryAs` |
| Replace recursive N+1 loops with CTE | `adminOrganizations.hierarchy.ts` | Already uses CTEs |
| Pass `tx` to `validateHierarchy` / `getSubtreeDepth` | `adminOrganizations.hierarchy.ts` | Already uses `tx` |
| Email batch guard — collect per-job outcomes, no mid-batch throw | `email.handler.ts` | Already implemented |
| `await queryClient.invalidateQueries` in admin route callbacks | `admin/*.tsx` | Already awaited |
| Cleanup ref for `useAutoSelectOrg` floating promise | `dashboard.tsx` | Already has `activePromiseRef` |
| `await` consent sync POST in `register.tsx` | `register.tsx` | Already awaited |
| Feature flag stampede protection | `featureFlags.service.ts` | Already has `pending` cache |
| Hoist `allPerms` query outside loop | `drizzleRbac.repository.ts` | Already hoisted |
| Move cookie after `saveConsent` succeeds | `consent.controller.ts` | Already correct for authenticated path |

## Verification

- `bun run lint` — passed (21 warnings, all pre-existing, none related to changes)
- `bun run typecheck -- --filter=@repo/api --filter=@repo/web` — `@repo/web` passed; `@repo/api` failed on pre-existing test errors (`user.service.test.ts` argument mismatch, `adminOrganizations.hierarchy.ts` RowList type, `adminOrganizations.service.ts` uninitialized variable) unrelated to this commit
- No DB schema changes required

## Commit

`df8304d` — `fix: async discipline — await callbacks, transaction boundaries, batch queries`
