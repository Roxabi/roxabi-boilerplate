import { expect, test as setup } from '@playwright/test'
import { AuthPage } from './auth.page'
import { AUTH_FILE, PRIMARY_ORG_SLUG, TEST_USER } from './testHelpers'

/**
 * Authenticate once and save the storage state (cookies + localStorage)
 * so that all dependent test projects can skip the login UI.
 */
setup('authenticate', async ({ page }) => {
  const auth = new AuthPage(page)
  await auth.gotoLogin()
  await auth.loginWithPassword(TEST_USER.email, TEST_USER.password)

  // Wait for redirect to dashboard/org — generous timeout for CI
  await page.waitForURL(/\/(dashboard|org)/, { timeout: 45_000 })

  // Verify we're actually authenticated
  await expect(page).not.toHaveURL(/\/login/)

  // Set the active organization so permission-based routes work.
  // TEST_USER is owner of the primary org (slug = PRIMARY_ORG_SLUG). Without an
  // active org, activeOrganizationId is null and permissions are empty, causing
  // admin and api-keys tests to fail.
  //
  // We call the NestJS API directly (bypassing the Nitro proxy layer) for test setup
  // reliability. page.context().request shares the browser's cookie jar: cookies sent
  // in the request and Set-Cookie headers in the response are both applied to the context.
  const setActiveResponse = await page
    .context()
    .request.post(
      `${process.env.API_URL ?? 'http://localhost:4000'}/api/auth/organization/set-active`,
      {
        data: { organizationSlug: PRIMARY_ORG_SLUG },
        headers: {
          'Content-Type': 'application/json',
          // Required by better-auth's CSRF origin check (trustedOrigins = [APP_URL])
          Origin: process.env.BASE_URL ?? 'http://localhost:3000',
        },
      }
    )
  expect(setActiveResponse.ok()).toBe(true)

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

  // Save signed-in state for reuse by other projects
  await page.context().storageState({ path: AUTH_FILE })
})
