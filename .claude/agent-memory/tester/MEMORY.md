# Tester Agent Memory

## E2E Playwright Patterns

Key conventions observed in `/apps/web/e2e/`:

- `const hasApi = Boolean(process.env.DATABASE_URL) || !process.env.CI` — always at top of spec
- `test.skip(() => !hasApi, 'Skipped: no DATABASE_URL in CI')` — inside every describe block
- Unauthenticated tests: `test.use({ storageState: { cookies: [], origins: [] } })`
- Authenticated tests: no `test.use` override — shared storageState from `auth.setup.ts` applies
- `NAVIGATION_TIMEOUT = 45_000` for `waitForURL` calls; `15_000` for `toBeVisible` assertions
- POM: getter-based `Locator` properties, NO assertions, `private async waitForHydration()` for forms
- `waitForHydration()` checks for `__react` prefix on DOM node keys (React fiber attachment)

## Registration Page (`/register`)

- Name: `input#name`, Email: `input#email`, Password: `input#password`
- Terms checkbox: `#accept-terms` — must be checked before submit button is enabled
- Submit: `getByRole('button', { name: /create account|sign up|register|creating/i })`
- Success state: renders `RegistrationSuccess` component with `backToLoginLink` (link to `/login`)
- Error: `[data-slot="form-message"]` for API errors; `#email-error` for inline email validation
- Existing seed user for duplicate email test: `dev@roxabi.local`

## Profile Page (`/settings/profile`)

- Display name: `input#fullName` (fullName field, not firstName/lastName)
- Save button: `getByRole('button', { name: /save|saving/i })`
- Success toast: `[data-sonner-toast][data-type="success"]`
- Avatar image: `img[alt]` inside AvatarCustomizationSection (DiceBear URL as `src`)
- Page has a `<form>` wrapper — wait for it after `goto()`

## API Keys Page (`/settings/api-keys`)

- Empty state: `[class*="border-dashed"]` div with create button
- List: `<table>` with rows per key
- Create dialog key name input: `input#api-key-name`
- Create confirm button: `getByRole('button', { name: /^create$/i })`
- One-time key display: `[data-slot="dialog-content"] code`
- Done button to close one-time display: `getByRole('button', { name: /done/i })`
- Revoke button per row: filter `getByRole('row')` by key name text, then `getByRole('button', { name: /revoke/i })`
- Revoke confirm dialog (DestructiveConfirmDialog): has input for key name + destructive button
- After revocation: row stays visible with revoke button disabled (not removed)

## Seeded Test Users

- `TEST_USER`: `dev@roxabi.local` / `password123` — used for shared auth setup
- `TEST_USER_2`: `admin@roxabi.local` / `password123` — used for unauthenticated tests
- `SUPERADMIN_USER`: `superadmin@roxabi.local` / `password123` — superadmin session

## E2E Import Conventions

- E2E files in `apps/web/e2e/` use bare relative imports WITHOUT `.js` extensions
  - Correct: `import { AuthPage } from './auth.page'`
  - Wrong: `import { AuthPage } from './auth.page.js'`
  - The `.js` rule applies to Vitest/src files only, NOT Playwright e2e files

## Auth Storage Paths

- Regular user: `./apps/web/e2e/.auth/user.json` (from `auth.setup.ts`)
- Superadmin: `./apps/web/e2e/.auth/superadmin.json` (from `system-admin.setup.ts`)
- Paths are relative to repo root (config lives at repo root)

## Playwright Config Pattern (`packages/playwright-config/base.ts`)

- Setup projects use `testMatch` regexp; browser projects use `testIgnore` regexp
- Regular browser projects must ignore BOTH setup files AND spec files for dedicated projects
- `testIgnore` for regular browsers: `/(?:auth|system-admin)\.setup\.ts|system-admin\.spec\.ts/`
- Dedicated project for system-admin: `testMatch: /system-admin\.spec\.ts/`
- All conditional project additions are guarded: `...(hasDatabase ? [...] : [])`

## Admin UI Structure

- Admin nav: `aria-label="Admin navigation"` — visible on desktop sidebar
- ORG_LINKS: Members (`/admin/members`), Settings (`/admin/settings`)
- SYSTEM_LINKS: Users, Organizations, System Settings, Feature Flags, Audit Logs
  - Visible only to superadmin (guarded by `useCanAccess('/admin/users')`)
- OrgSwitcher: ghost button in `<header>` showing org name + ChevronDown icon
- Members search: Input with `aria-label` = i18n placeholder text
- Settings form: `id="org-name"` and `id="org-slug"` inputs
