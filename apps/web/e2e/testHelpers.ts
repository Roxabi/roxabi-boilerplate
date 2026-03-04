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

/**
 * Fetch the most recent magic link from Mailpit REST API.
 * Returns the `/magic-link/verify?token=...` path.
 *
 * Requires Mailpit running at http://localhost:8025 (started via `bun run db:up`).
 */
export async function getMagicLinkToken(
  request: import('@playwright/test').APIRequestContext,
  maxAttempts = 8
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const listRes = await request.get('http://localhost:8025/api/v1/messages?limit=1', {
        timeout: 5_000,
      })
      if (!listRes.ok()) throw new Error(`Mailpit returned HTTP ${listRes.status()}`)
      const listBody = (await listRes.json()) as { messages?: Array<{ ID: string }> }
      const msgId = listBody.messages?.[0]?.ID
      if (!msgId) throw new Error('No emails in Mailpit yet')
      // The list endpoint only returns metadata — fetch the full message for HTML body
      const msgRes = await request.get(`http://localhost:8025/api/v1/message/${msgId}`, {
        timeout: 5_000,
      })
      if (!msgRes.ok()) throw new Error(`Mailpit message fetch returned HTTP ${msgRes.status()}`)
      const msg = (await msgRes.json()) as { HTML?: string }
      const html = msg.HTML
      if (!html) throw new Error('Magic link email has no HTML body')
      const match = html.match(/href="[^"]*\/magic-link\/verify\?token=([^"&]+)/)
      if (!match) throw new Error('Magic link token not found in email HTML')
      return `/magic-link/verify?token=${match[1]}`
    } catch (err) {
      if (attempt === maxAttempts - 1) {
        throw new Error(
          `getMagicLinkToken failed after ${maxAttempts} attempts: ${err instanceof Error ? err.message : err}`
        )
      }
      const waitMs = Math.min(500 * 2 ** attempt, 5_000)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
  }
  // unreachable — satisfies TypeScript
  throw new Error('getMagicLinkToken: exhausted attempts')
}
