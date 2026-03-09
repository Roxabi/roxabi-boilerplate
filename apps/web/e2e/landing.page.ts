import type { Locator, Page } from '@playwright/test'

/**
 * Page Object Model for the Landing Page.
 *
 * Encapsulates locators and navigation. Assertions stay in the spec file.
 */
export class LandingPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  // ---------------------------------------------------------------------------
  // Hero section
  // ---------------------------------------------------------------------------

  get heroBadge(): Locator {
    return this.page.getByText('Open-Source SaaS Boilerplate')
  }

  get heroTitle(): Locator {
    return this.page.getByText('Skip the infrastructure.')
  }

  get getStartedLink(): Locator {
    return this.page.getByRole('link', { name: 'Get Started' }).first()
  }

  get githubLink(): Locator {
    return this.page.getByRole('link', { name: 'GitHub' }).first()
  }

  // ---------------------------------------------------------------------------
  // Features section
  // ---------------------------------------------------------------------------

  get featuresSectionHeading(): Locator {
    return this.page.getByText('Everything you need to ship')
  }

  get fullStackTypeScriptCard(): Locator {
    return this.page.getByText('Full-Stack TypeScript')
  }

  get authAndUsersCard(): Locator {
    return this.page.getByText('Auth & Users')
  }

  get aiPoweredDevCard(): Locator {
    return this.page.getByText('AI-Powered Dev', { exact: true })
  }

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------

  get header(): Locator {
    return this.page.locator('header')
  }

  get brandLink(): Locator {
    return this.page.getByRole('link', { name: 'Roxabi' })
  }

  // ---------------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------------

  get footer(): Locator {
    return this.page.locator('footer')
  }

  get footerBrand(): Locator {
    return this.footer.getByText('Roxabi')
  }

  get footerGithubLink(): Locator {
    return this.footer.getByRole('link', { name: 'GitHub' })
  }
}
