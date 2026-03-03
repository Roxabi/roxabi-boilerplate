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

  // Set the consent cookie programmatically so the banner is suppressed in all subsequent
  // test pages. Clicking the UI button during hydration is unreliable (DOM node detaches).
  // storageState() captures cookies set via document.cookie, so the banner stays dismissed.
  // Keep policyVersion in sync with legalConfig.consentPolicyVersion in legal.config.ts.
  await page.evaluate(() => {
    const payload = {
      categories: { necessary: true, analytics: false, marketing: false },
      consentedAt: new Date().toISOString(),
      policyVersion: '2026-02-v1',
      action: 'rejected',
    }
    // biome-ignore lint/suspicious/noDocumentCookie: test setup — sets consent cookie for storageState persistence
    document.cookie = `consent=${encodeURIComponent(JSON.stringify(payload))}; Path=/; SameSite=Lax`
  })

  // Save signed-in state for reuse by system-admin browser projects
  await page.context().storageState({ path: SUPERADMIN_AUTH_FILE })
})
