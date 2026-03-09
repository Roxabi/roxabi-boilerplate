import { expect, test } from '@playwright/test'
import { LandingPage } from './landing.page'

test.describe('Landing Page', () => {
  test('should display hero content with CTA buttons when page loads', async ({ page }) => {
    // Arrange
    const landing = new LandingPage(page)

    // Act
    await landing.goto()

    // Assert
    await expect(landing.heroBadge).toBeVisible()
    await expect(landing.heroTitle).toBeVisible()
    await expect(landing.getStartedLink).toBeVisible()
    await expect(landing.githubLink).toBeVisible()
  })

  test('should display feature cards when page loads', async ({ page }) => {
    // Arrange
    const landing = new LandingPage(page)

    // Act
    await landing.goto()

    // Assert
    await expect(landing.featuresSectionHeading).toBeVisible()
    await expect(landing.fullStackTypeScriptCard).toBeVisible()
    await expect(landing.authAndUsersCard).toBeVisible()
    await expect(landing.aiPoweredDevCard).toBeVisible()
  })

  test('should display header navigation when page loads', async ({ page }) => {
    // Arrange
    const landing = new LandingPage(page)

    // Act
    await landing.goto()

    // Assert
    await expect(landing.header).toBeVisible()
    await expect(landing.brandLink).toBeVisible()
  })

  test('should navigate to docs when Get Started button is clicked', async ({ page }) => {
    // Arrange
    const landing = new LandingPage(page)
    await landing.goto()

    // Act
    await landing.getStartedLink.click()

    // Assert
    await expect(page).toHaveURL(/\/docs/)
  })

  test('should display footer with links when page loads', async ({ page }) => {
    // Arrange
    const landing = new LandingPage(page)

    // Act
    await landing.goto()

    // Assert
    await expect(landing.footer).toBeVisible()
    await expect(landing.footerBrand).toBeVisible()
    await expect(landing.footerGithubLink).toBeVisible()
  })
})
