import type { Page } from '@playwright/test'

/**
 * Shared test utilities for E2E tests.
 * Provides helper functions for common test operations.
 */

/** Whether the API is available (DATABASE_URL set, or not in CI). */
export const hasApi = Boolean(process.env.DATABASE_URL) || !process.env.CI

/** Generous timeout for navigations in CI (covers cold-start API responses). */
export const NAVIGATION_TIMEOUT = 45_000

/** Credentials matching apps/api/scripts/fixtures/auth.fixture.ts */
export const TEST_USER = {
  email: 'dev@roxabi.local',
  password: 'password123',
  name: 'Dev User',
}

export const TEST_USER_2 = {
  email: 'admin@roxabi.local',
  password: 'password123',
  name: 'Admin User',
}

export const SUPERADMIN_USER = {
  email: 'superadmin@roxabi.local',
  password: 'password123',
  name: 'Super Admin',
}

/** Path to the regular-user auth storage state file (relative to repo root). */
export const AUTH_FILE = './apps/web/e2e/.auth/user.json'

/** Path to the superadmin auth storage state file (relative to repo root). */
export const SUPERADMIN_AUTH_FILE = './apps/web/e2e/.auth/superadmin.json'

/**
 * Wait for React hydration to complete.
 * TanStack Start SSR renders the HTML, but event handlers (e.g. e.preventDefault())
 * are only attached after React hydrates. Interacting before hydration causes
 * plain HTML form submits instead of JS-handled ones.
 *
 * @param page - Playwright page object
 */
export async function waitForReactHydration(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('button[type="submit"]')
      if (!btn) return false
      // React attaches __reactFiber$ / __reactProps$ to DOM nodes during hydration
      return Object.keys(btn).some((k) => k.startsWith('__react'))
    },
    { timeout: 15000 }
  )
}
