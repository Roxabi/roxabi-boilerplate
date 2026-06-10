# Phase 5 Summary: Config & Validation

## Commit
`015f64d` — `chore: strict config validation — getOrThrow, env schema, remove dead code`

## Files Modified (21)

### API — Auth & Config
| File | Change |
|------|--------|
| `apps/api/src/auth/auth.service.ts` | `config.getOrThrow('BETTER_AUTH_URL')`, `config.getOrThrow('APP_URL')`, added `appName` to config |
| `apps/api/src/auth/auth.controller.ts` | Removed `?? 'localhost'` fallback in `new URL(req.url, ...)` |
| `apps/api/src/auth/auth.instance.ts` | Replaced `process.env.APP_NAME` with `config.appName ?? 'App'`; added `appName` to `AuthInstanceConfig` |
| `apps/api/src/gdpr/gdpr.controller.ts` | Injected `ConfigService`, uses `configService.get('APP_NAME')` |

### API — Validation
| File | Change |
|------|--------|
| `apps/api/src/admin/adminSettings.controller.ts` | Added `SETTING_VALUE_SCHEMAS` per-key map; replaced `z.unknown()` with `z.union([z.string(), z.number(), z.boolean(), z.null()])` + array-level `.refine()` |
| `apps/api/src/user/user.controller.ts` | `orgResolutionSchema` IDs changed from `z.string().min(1)` to `z.string().uuid()` |
| `apps/api/src/admin/adminOrganizations.controller.ts` | `limit` changed from `z.preprocess` to `z.coerce.number().int().min(1).max(100).default(20)` |
| `apps/api/src/admin/adminUsers.controller.ts` | Same `limit` coercion as above |

### Web — Env & Auth
| File | Change |
|------|--------|
| `apps/web/src/lib/authClient.ts` | SSR `baseURL` reads `import.meta.env.VITE_APP_URL`; throws if missing on SSR |
| `apps/web/src/lib/routePermissions.ts` | Uses `env.API_URL` instead of `process.env.API_URL` |
| `apps/web/src/lib/env.server.schema.ts` | Removed `http://localhost:4000` default from `API_URL`; made optional |
| `apps/web/vite.config.ts` | Derives `VITE_APP_URL` from `APP_URL`; build-time validation throws if `APP_URL` missing in production |

### Web — Routes (SPA navigation)
| File | Change |
|------|--------|
| `apps/web/src/routes/magic-link/verify.tsx` | `window.location.reload()` → `navigate({ to: '/login' })`; `window.location.href` → `navigate({ to: '/api/auth/...', reloadDocument: true })` |
| `apps/web/src/routes/admin/settings.tsx` | `window.location.reload()` → `navigate({ to: '/dashboard', reloadDocument: true })`; `window.location.href = '/'` → `navigate({ to: '/' })` |
| `apps/web/src/routes/settings/-account-delete.tsx` | Removed `console.error` leak |
| `apps/web/src/routes/settings/-account-credentials.tsx` | Removed `console.error` leaks (email + password sections) |
| `apps/web/src/routes/settings/api-keys/-components/error-state.tsx` | `window.location.reload()` → `navigate({ to: '.' })` |

### Web — Legal Config
| File | Change |
|------|--------|
| `apps/web/src/config/legal.config.ts` | Build-time throw if `companyName` is still `'ACME Corp SAS'` in production |

### Tests Updated (3)
| File | Change |
|------|--------|
| `apps/api/src/admin/adminOrganizations.controller.test.ts` | Updated limit test: clamping → `BadRequestException` for out-of-range |
| `apps/api/src/admin/adminUsers.controller.test.ts` | Added `BadRequestException` import; updated limit tests for coercion |
| `apps/web/src/routes/magic-link/verify.test.tsx` | Mocked `navigate` instead of `window.location.reload`/`window.location.href` |

## Test Results
- `apps/api/src/auth/auth.service.test.ts` — 7 passed
- `apps/api/src/admin/adminSettings.controller.test.ts` — 16 passed
- `apps/api/src/user/user.controller.test.ts` — 14 passed
- `apps/api/src/admin/adminOrganizations.controller.test.ts` — 31 passed
- `apps/api/src/admin/adminUsers.controller.test.ts` — 36 passed
- `apps/web/src/routes/settings/account.test.tsx` — 11 passed
- `apps/web/src/routes/magic-link/verify.test.tsx` — 16 passed

## Lint/Typecheck
- Phase 5 files: zero lint errors, zero type errors
- Project-wide lint: pre-existing warnings in other phases (not introduced by Phase 5)

## Acceptance Criteria Status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Zero `http://localhost` fallbacks in production code | Done |
| 2 | `config.getOrThrow` for required env vars | Done |
| 3 | `process.env.APP_NAME` replaced with `configService.get('APP_NAME')` | Done |
| 4 | `orgResolutionSchema` rejects non-UUID strings | Done |
| 5 | `batchUpdate` rejects invalid setting values per-key | Done |
| 6 | `adminOrganizations`/`adminUsers` limit uses `z.coerce.number().int()` | Done |
| 7 | Zero `window.location.reload()`/`window.location.href` in SPA routes | Done |
| 8 | Zero `console.error` in production UI code | Done |
| 9 | `legal.config.ts` externalized or build fails on placeholder | Done |
| 10 | Tests pass | Done |

## Blockers / Notes
- None. Phase 5 complete.
