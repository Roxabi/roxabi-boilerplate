import { expect, test as setup } from '@playwright/test'
import { AuthPage } from './auth.page'
import { SUPERADMIN_AUTH_FILE, SUPERADMIN_USER } from './testHelpers'

/**
 * Authenticate once as a superadmin user and save the storage state (cookies +
 * localStorage) so that all system-admin test projects can skip the login UI.
 */
setup('authenticate as superadmin', async ({ page }) => {
  const auth = new AuthPage(page)
  await auth.gotoLogin()
  await auth.loginWithPassword(SUPERADMIN_USER.email, SUPERADMIN_USER.password)

  // Wait for redirect to dashboard/org — generous timeout for CI
  await page.waitForURL(/\/(dashboard|org|admin)/, { timeout: 45_000 })

  // Verify we're actually authenticated
  await expect(page).not.toHaveURL(/\/login/)

  // Inject the consent cookie directly into Playwright's cookie jar so it is captured by
  // storageState() and sent with every subsequent test request (including SSR). This prevents
  // the consent banner from appearing in tests. page.evaluate/document.cookie is unreliable
  // here because it may not be reflected in storageState on all browser engines.
  // Keep policyVersion in sync with legalConfig.consentPolicyVersion in legal.config.ts.
  const consentPayload = {
    categories: { necessary: true, analytics: false, marketing: false },
    consentedAt: new Date().toISOString(),
    policyVersion: '2026-02-v1',
    action: 'rejected',
  }
  const appHost = new URL(process.env.BASE_URL ?? 'http://localhost:3000').hostname
  await page.context().addCookies([
    {
      name: 'consent',
      value: encodeURIComponent(JSON.stringify(consentPayload)),
      domain: appHost,
      path: '/',
      sameSite: 'Lax',
    },
  ])

  // Save signed-in state for reuse by system-admin browser projects
  await page.context().storageState({ path: SUPERADMIN_AUTH_FILE })
})
