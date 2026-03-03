import type { Locator, Page } from '@playwright/test'
import { waitForReactHydration } from './testHelpers'

/**
 * Page Object Model for Auth flows (login, signup, logout).
 *
 * Encapsulates locators and navigation for authentication pages.
 */
export class AuthPage {
  constructor(private page: Page) {}

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async gotoLogin() {
    await this.page.goto('/login')
    await waitForReactHydration(this.page)
  }

  async gotoSignup() {
    await this.page.goto('/signup')
    await waitForReactHydration(this.page)
  }

  // ---------------------------------------------------------------------------
  // Login Tab — Password
  // ---------------------------------------------------------------------------

  get loginEmailInput(): Locator {
    return this.page.getByLabel(/email/i).first()
  }

  get loginPasswordInput(): Locator {
    return this.page.locator('input#password')
  }

  get loginSubmitButton(): Locator {
    return this.page.getByRole('button', { name: /sign in|submit/i }).first()
  }

  async loginWithPassword(email: string, password: string) {
    await this.loginEmailInput.fill(email)
    await this.loginPasswordInput.fill(password)
    await this.loginSubmitButton.click()
  }

  // ---------------------------------------------------------------------------
  // Signup
  // ---------------------------------------------------------------------------

  get signupEmailInput(): Locator {
    return this.page.getByLabel(/email/i).first()
  }

  get signupPasswordInput(): Locator {
    return this.page.locator('input#password')
  }

  get signupNameInput(): Locator {
    return this.page.getByLabel(/name/i, { exact: false }).first()
  }

  get signupSubmitButton(): Locator {
    return this.page.getByRole('button', { name: /sign up|create|register/i }).first()
  }

  async signup(email: string, password: string, name?: string) {
    if (name) {
      await this.signupNameInput.fill(name)
    }
    await this.signupEmailInput.fill(email)
    await this.signupPasswordInput.fill(password)
    await this.signupSubmitButton.click()
  }

  // ---------------------------------------------------------------------------
  // OAuth
  // ---------------------------------------------------------------------------

  get googleOAuthButton(): Locator {
    return this.page.getByRole('button', { name: /google/i }).first()
  }

  get githubOAuthButton(): Locator {
    return this.page.getByRole('button', { name: /github/i }).first()
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  get userMenuTrigger(): Locator {
    return this.page.getByRole('button', { name: /user menu|profile|account/i })
  }

  get logoutButton(): Locator {
    return this.page.getByRole('menuitem', { name: /sign out|log\s?out/i })
  }

  async logout() {
    await this.userMenuTrigger.click()
    await this.logoutButton.waitFor({ state: 'visible', timeout: 5000 })
    await this.logoutButton.click()
  }

  // ---------------------------------------------------------------------------
  // Error Messages
  // ---------------------------------------------------------------------------

  get errorAlert(): Locator {
    return this.page.locator('[data-slot="form-message"]').first()
  }

  async getErrorText(): Promise<string | null> {
    const error = this.errorAlert
    const visible = await error.isVisible().catch(() => false)
    if (!visible) return null
    return error.textContent()
  }

  // ---------------------------------------------------------------------------
  // Navigation (after login)
  // ---------------------------------------------------------------------------

  get dashboardLink(): Locator {
    return this.page.getByRole('link', { name: /dashboard/i }).first()
  }
}
