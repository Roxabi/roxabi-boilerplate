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
    // 60s timeout: ProfileSettingsPage returns null until useSession() resolves (API call).
    // On CI cold-start the first DB-backed API response can take 30–50s. 60s matches the
    // global CI test timeout and covers both webkit slowness and API warm-up time.
    await this.page.waitForSelector('form', { timeout: 60_000 })
    // The consent banner briefly appears on first render (TanStack Start renders the
    // shellComponent before the root loader resolves — so loaderData is undefined on
    // the first render, causing initialConsent=null and showBanner=true). It disappears
    // once client-side hydration reads the consent cookie. Wait for it to be gone before
    // interacting, otherwise it intercepts clicks on elements near the bottom of the viewport.
    await this.waitForConsentBannerGone()
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
   * Uses the specific alt text ("Avatar preview") to avoid matching the hidden nav avatar.
   */
  get avatarImage(): Locator {
    return this.page.getByAltText(/avatar preview/i)
  }

  /**
   * The save button (type="submit") scoped to the profile form to avoid matching
   * other "Save" buttons that may exist on the page (e.g., consent banner actions).
   */
  get saveButton(): Locator {
    return this.page
      .locator('form')
      .getByRole('button', { name: /save|saving/i })
      .first()
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
   * Wait until the consent banner is no longer visible.
   *
   * Root cause: TanStack Start renders shellComponent (which mounts ConsentProvider)
   * before the root loader resolves. On first render loaderData is undefined, so
   * initialConsent=null and the banner shows. Once the loader data arrives and
   * React hydrates, the banner disappears. This takes ~100–500ms on production builds.
   *
   * The consent cookie IS correctly set in storageState via auth.setup.ts addCookies(),
   * but this does not help because the race is in the render pipeline, not the cookie jar.
   *
   * This method is a fast no-op when the banner is already hidden.
   */
  async waitForConsentBannerGone(timeout = 10_000): Promise<void> {
    const banner = this.page.locator('section[aria-label*="ookie" i]')
    const visible = await banner.isVisible().catch(() => false)
    if (!visible) return
    await banner.waitFor({ state: 'hidden', timeout })
  }

  /**
   * Fill the display name field and click save.
   * Waits for the consent banner to be gone before clicking — the banner is
   * fixed-position at the bottom of the viewport and intercepts clicks on
   * elements rendered near the bottom of the page.
   */
  async updateName(name: string) {
    await this.displayNameInput.fill(name)
    await this.waitForConsentBannerGone()
    await this.saveButton.click()
  }
}
