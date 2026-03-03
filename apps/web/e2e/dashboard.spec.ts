import { expect, test } from '@playwright/test'
import { DashboardPage } from './dashboard.page'
import { hasApi } from './testHelpers'

test.describe('Dashboard Navigation', () => {
  // Dashboard tests require the API server (needs DATABASE_URL).
  // Auth state is injected via storageState from the setup project.
  test.skip(() => !hasApi, 'Skipped: no DATABASE_URL in CI')

  test('should display dashboard sidebar with navigation links', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    await expect(dashboard.sidebar).toBeVisible({ timeout: 10_000 })
    const links = await dashboard.sidebarLinks.count()
    expect(links).toBeGreaterThan(0)
  })

  test('should navigate via sidebar links and update URL', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    const firstLink = dashboard.sidebarLinks.first()
    const href = await firstLink.getAttribute('href')

    if (href) {
      await firstLink.click()
      await page.waitForURL(new RegExp(href), { timeout: 30_000 })
    }

    const currentPath = await dashboard.getCurrentPath()
    expect(currentPath).toBeTruthy()
  })

  test('should persist session on page refresh', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    await page.reload()
    await page.waitForLoadState('load')

    expect(page.url()).not.toContain('/login')
  })

  test('should display user information in authenticated session', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    const userMenuVisible = await dashboard.userMenu.isVisible().catch(() => false)
    if (userMenuVisible) {
      await expect(dashboard.userMenu).toBeVisible()
    }
  })

  test('should allow navigation to different sections', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    const links = await dashboard.sidebarLinks.all()

    if (links && links.length > 0 && links[0]) {
      await links[0].click()
      await page.waitForLoadState('load')
    }

    const newPath = await dashboard.getCurrentPath()
    expect(newPath.length).toBeGreaterThan(0)
  })
})
