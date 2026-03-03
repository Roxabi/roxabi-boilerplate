import { expect, test as setup } from '@playwright/test'
import { AuthPage } from './auth.page'
import { AUTH_FILE, TEST_USER } from './testHelpers'

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
  // TEST_USER (dev@roxabi.local) is owner of 'roxabi-dev'. Without an active
  // org, activeOrganizationId is null and permissions are empty, causing admin
  // and api-keys tests to fail.
  //
  // We call the NestJS API at port 4000 directly (bypassing Nitro's devProxy)
  // because Nitro strips Set-Cookie headers when proxying the response, so the
  // browser's cookie jar never gets updated when going through port 3000.
  // page.context().request shares the browser's cookie jar: cookies are sent
  // and Set-Cookie headers from the response are applied to the context.
  const setActiveResponse = await page
    .context()
    .request.post('http://localhost:4000/api/auth/organization/set-active', {
      data: { organizationSlug: 'roxabi-dev' },
      headers: {
        'Content-Type': 'application/json',
        // Required by better-auth's CSRF origin check (trustedOrigins = [APP_URL])
        Origin: 'http://localhost:3000',
      },
    })
  if (!setActiveResponse.ok()) {
    console.warn(
      `[auth.setup] set-active-org failed (${setActiveResponse.status()}) — admin/api-keys tests may not work`
    )
  }

  // Save signed-in state for reuse by other projects
  await page.context().storageState({ path: AUTH_FILE })
})
