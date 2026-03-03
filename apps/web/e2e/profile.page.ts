import type { Locator, Page } from '@playwright/test'

/**
 * Page Object Model for the User Profile settings page (/settings/profile).
 *
 * Encapsulates locators and helpers for the profile form.
 * No assertions inside this class — tests assert on the returned values.
 */
export class ProfilePage {
  constructor(private page: Page) {}

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async goto() {
    await this.page.goto('/settings/profile')
    // Wait for the name input to be visible.
    await this.displayNameInput.waitFor({ state: 'visible', timeout: 15_000 })
    // The profile form populates inputs asynchronously from /api/users/me.
    // Wait until the display name has a non-empty value before returning.
    await this.page.waitForFunction(
      () => {
        const el = document.getElementById('fullName') as HTMLInputElement | null
        return !!el && el.value.length > 0
      },
      { timeout: 10_000 }
    )
  }

  // ---------------------------------------------------------------------------
  // Locators
  // ---------------------------------------------------------------------------

  /**
   * The display name (fullName) input — the primary name shown in the UI.
   * Corresponds to `input#fullName` in ProfileInfoSection.
   */
  get displayNameInput(): Locator {
    return this.page.locator('input#fullName')
  }

  /**
   * The DiceBear avatar preview image rendered inside AvatarCustomizationSection.
   */
  get avatarImage(): Locator {
    return this.page.locator('img[alt]').first()
  }

  /**
   * The save button (type="submit") at the bottom of the profile form.
   */
  get saveButton(): Locator {
    return this.page.getByRole('button', { name: /save|saving/i }).first()
  }

  /**
   * Success feedback — the Sonner toast message shown after a successful save.
   * Sonner renders toasts with `[data-sonner-toast]` attributes.
   */
  get successFeedback(): Locator {
    return this.page.locator('[data-sonner-toast][data-type="success"]').first()
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Fill the display name field and click save.
   */
  async updateName(name: string) {
    await this.displayNameInput.fill(name)
    await this.saveButton.click()
  }
}
