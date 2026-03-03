import { expect, test } from '@playwright/test'
import { AdminPage } from './admin.page'
import { hasApi, NAVIGATION_TIMEOUT } from './testHelpers'

// Org Admin tests use the authenticated session injected via storageState from
// the setup project (TEST_USER = dev@roxabi.local, has members:write permission,
// belongs to at least one org).
test.describe('Org Admin', () => {
  test.skip(() => !hasApi, 'Skipped: no DATABASE_URL in CI')

  test('should display admin sidebar with org links', async ({ page }) => {
    // Arrange
    const admin = new AdminPage(page)

    // Act
    await admin.gotoMembers()
    await page.waitForURL(/\/admin/, { timeout: NAVIGATION_TIMEOUT })

    // Assert — admin nav is visible with org-level links
    await expect(admin.adminNav).toBeVisible({ timeout: 15_000 })
    await expect(admin.membersLink).toBeVisible()
    await expect(admin.settingsLink).toBeVisible()
  })

  test('should display member list', async ({ page }) => {
    // Arrange
    const admin = new AdminPage(page)

    // Act
    await admin.gotoMembers()
    await page.waitForURL(/\/admin\/members/, { timeout: NAVIGATION_TIMEOUT })

    // Assert — at least the members section heading is visible
    // (the card renders even when data is loading or populated)
    await expect(admin.membersHeading).toBeVisible({ timeout: 15_000 })
  })

  test('should search members', async ({ page }) => {
    // Arrange
    const admin = new AdminPage(page)
    await admin.gotoMembers()
    await page.waitForURL(/\/admin\/members/, { timeout: NAVIGATION_TIMEOUT })

    // Act — wait for member rows to be present before searching
    await expect(admin.membersHeading).toBeVisible({ timeout: 15_000 })
    await expect(admin.memberSearch).toBeVisible()
    await admin.memberSearch.fill('dev')

    // Assert — input reflects the typed value and filtered rows match the query
    await expect(admin.memberSearch).toHaveValue('dev')
    // Wait for filtering to apply, then verify visible rows contain 'dev'
    await expect(admin.memberRows.first()).toContainText(/dev/i, { timeout: 5_000 })
  })

  test('should display org settings', async ({ page }) => {
    // Arrange
    const admin = new AdminPage(page)

    // Act
    await admin.gotoSettings()
    await page.waitForURL(/\/admin\/settings/, { timeout: NAVIGATION_TIMEOUT })

    // Assert — the settings page heading and form fields are visible
    await expect(admin.settingsHeading).toBeVisible({ timeout: 15_000 })
    await expect(admin.orgNameInput).toBeVisible()
    await expect(admin.orgSlugInput).toBeVisible()
  })

  test('should show current org context in header', async ({ page }) => {
    // OrgSwitcher is only rendered on md+ viewports (Header.tsx: <div className="hidden md:flex">).
    // On mobile (<768px) the switcher is hidden — skip rather than wait 15s and time out.
    if ((page.viewportSize()?.width ?? 0) < 768) {
      test.skip()
      return
    }

    // Arrange
    const admin = new AdminPage(page)

    // Act
    await admin.gotoMembers()
    await page.waitForURL(/\/admin/, { timeout: NAVIGATION_TIMEOUT })

    // Assert — the header contains a button that shows the current org name
    // (OrgSwitcher renders a ghost button with the active org name)
    await expect(admin.adminNav).toBeVisible({ timeout: 15_000 })
    // The sidebar nav is SSR-rendered; the header org switcher is client-side.
    // Wait for client-side hydration before reading the org name.
    await admin.waitForOrgSwitcher()
    const orgName = await admin.getCurrentOrgName()
    expect(orgName).toBeTruthy()
  })

  test('should switch between organizations', async ({ page }) => {
    // OrgSwitcher is only rendered on md+ viewports (Header.tsx: <div className="hidden md:flex">).
    // On mobile (<768px) the switcher is hidden — skip rather than time out.
    if ((page.viewportSize()?.width ?? 0) < 768) {
      test.skip()
      return
    }

    // Arrange — TEST_USER (dev@roxabi.local) belongs to 2 orgs
    const admin = new AdminPage(page)
    await admin.gotoMembers()
    await page.waitForURL(/\/admin/, { timeout: NAVIGATION_TIMEOUT })
    await expect(admin.adminNav).toBeVisible({ timeout: 15_000 })

    // Get the current org name via POM
    const initialOrgName = await admin.getCurrentOrgName()

    if (!initialOrgName) {
      // No org switcher present — single-org user or switcher not rendered
      test.skip()
      return
    }

    // Open the org switcher dropdown by clicking the button showing the current org name
    await admin.orgSwitcherByName(initialOrgName).click()
    const menu = admin.orgDropdownMenu
    await menu.waitFor({ state: 'visible', timeout: 5000 })

    // Find a menu item that is NOT the currently active org
    const menuItems = menu.getByRole('menuitem')
    const itemTexts = await menuItems.allTextContents()
    const otherOrgName = itemTexts.find((t) => t.trim() !== initialOrgName)?.trim() ?? null

    if (!otherOrgName) {
      // Only one org in the dropdown — cannot test switching
      await page.keyboard.press('Escape')
      test.skip()
      return
    }

    // Act — click the other org menu item and wait for the menu to close
    await menuItems.getByText(otherOrgName).click()
    await menu.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})

    // Assert — the org context changed
    const newOrgName = await admin.getCurrentOrgName()
    expect(newOrgName).not.toBe(initialOrgName)
  })
})
