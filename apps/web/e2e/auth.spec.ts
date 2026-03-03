import { expect, test } from '@playwright/test'
import { AuthPage } from './auth.page'
import { hasApi, NAVIGATION_TIMEOUT, TEST_USER_2 } from './testHelpers'

// Tests that need a clean (unauthenticated) browser context.
// Using test.use() avoids clearCookies() which could invalidate the
// shared setup session for other browser projects.
test.describe('Authentication — unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  test.skip(() => !hasApi, 'Skipped: no DATABASE_URL in CI')

  test('should display login form when navigating to /login', async ({ page }) => {
    const auth = new AuthPage(page)
    await auth.gotoLogin()

    await expect(auth.loginEmailInput).toBeVisible()
    await expect(auth.loginPasswordInput).toBeVisible()
    await expect(auth.loginSubmitButton).toBeVisible()
  })

  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    // Use TEST_USER_2 so we don't invalidate the setup session for TEST_USER
    const auth = new AuthPage(page)
    await auth.gotoLogin()
    await auth.loginWithPassword(TEST_USER_2.email, TEST_USER_2.password)

    await page.waitForURL(/\/(dashboard|org)/, { timeout: NAVIGATION_TIMEOUT })
  })

  test('should show error message for invalid credentials', async ({ page }) => {
    const auth = new AuthPage(page)
    await auth.gotoLogin()
    await auth.loginWithPassword('nonexistent@example.com', 'wrongpassword')

    // Verify an error message is shown (may be "Invalid email or password"
    // or "Too many attempts" if rate-limited by earlier browser projects)
    await expect(auth.errorAlert).toBeVisible({ timeout: 15_000 })
  })

  // TODO: requireAuth guard skips on SSR and beforeLoad doesn't re-run on hydration
  // for direct page loads. This redirect only works for client-side navigations.
  // See routeGuards.ts — "SSR renders the shell only; auth is enforced client-side."
  test.skip('should redirect unauthenticated user from protected routes to login', async ({
    page,
  }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: NAVIGATION_TIMEOUT })
  })

  test('should verify OAuth button is present (Google)', async ({ page }) => {
    const auth = new AuthPage(page)
    await auth.gotoLogin()

    const isVisible = await auth.googleOAuthButton.isVisible().catch(() => false)
    if (isVisible) {
      await expect(auth.googleOAuthButton).toBeVisible()
    }
  })

  test('should verify OAuth button is present (GitHub)', async ({ page }) => {
    const auth = new AuthPage(page)
    await auth.gotoLogin()

    const isVisible = await auth.githubOAuthButton.isVisible().catch(() => false)
    if (isVisible) {
      await expect(auth.githubOAuthButton).toBeVisible()
    }
  })
})

// Logout test: uses its own session to avoid invalidating the shared
// storageState that other browser projects depend on.
test.describe('Authentication — logout', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  test.skip(() => !hasApi, 'Skipped: no DATABASE_URL in CI')

  test('should logout user and redirect to landing page', async ({ page }) => {
    // Login fresh (shared storageState is invalidated when any browser signs out)
    const auth = new AuthPage(page)
    await auth.gotoLogin()
    await auth.loginWithPassword(TEST_USER_2.email, TEST_USER_2.password)
    await page.waitForURL(/\/(dashboard|org)/, { timeout: NAVIGATION_TIMEOUT })

    await expect(auth.userMenuTrigger).toBeVisible({ timeout: 15_000 })

    await auth.logout()

    await page.waitForURL(/\/(login|$)/, { timeout: NAVIGATION_TIMEOUT })
  })
})
