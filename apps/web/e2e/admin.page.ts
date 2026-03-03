import type { Locator, Page } from '@playwright/test'

const ORG_SWITCHER_EXCLUDE = /menu|theme|locale|github|sign in|sign up|open|close/i

/**
 * Page Object Model for Admin flows (org admin and system admin navigation).
 *
 * Encapsulates locators and navigation for admin pages.
 * No assertions inside this class — tests assert on the returned locators/data.
 */
export class AdminPage {
  constructor(private page: Page) {}

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async goto(path = '/admin/members') {
    await this.page.goto(path)
    // Wait for the admin navigation specifically (not just any nav/aside on the page).
    // 'aside' is too broad — it can match unrelated sidebar widgets before the admin
    // nav is ready.
    await this.page.waitForSelector('[aria-label*="admin" i], [aria-label*="navigation" i]', {
      // state: 'attached' — on mobile the desktop nav is CSS-hidden (inside aside.hidden),
      // which causes waitForSelector's default 'visible' state to pick the hidden desktop
      // nav (first in DOM order) and wait forever. 'attached' just confirms the admin nav
      // component has rendered; the visibility assertion is done by tests via adminNav.
      state: 'attached',
      timeout: 30_000,
    })
  }

  async gotoMembers() {
    await this.goto('/admin/members')
  }

  async gotoSettings() {
    await this.goto('/admin/settings')
  }

  async gotoUsers() {
    await this.goto('/admin/users')
  }

  async gotoOrganizations() {
    await this.goto('/admin/organizations')
  }

  async gotoFeatureFlags() {
    await this.goto('/admin/feature-flags')
  }

  async gotoAuditLogs() {
    await this.goto('/admin/audit-logs')
  }

  async gotoSystemSettings() {
    await this.goto('/admin/system-settings')
  }

  // ---------------------------------------------------------------------------
  // Admin sidebar — navigation container
  // ---------------------------------------------------------------------------

  /**
   * The desktop admin navigation sidebar (aria-label="Admin navigation").
   * Contains both org links and system links.
   */
  get adminNav(): Locator {
    return this.page.getByRole('navigation', { name: /admin navigation/i }).first()
  }

  // ---------------------------------------------------------------------------
  // Org sidebar links (Members, Settings)
  // ---------------------------------------------------------------------------

  get membersLink(): Locator {
    return this.adminNav.getByRole('link', { name: /members/i }).first()
  }

  get settingsLink(): Locator {
    return this.adminNav.getByRole('link', { name: /settings/i }).first()
  }

  // ---------------------------------------------------------------------------
  // System sidebar links (Users, Organizations, System Settings, Feature Flags, Audit Logs)
  // ---------------------------------------------------------------------------

  get usersLink(): Locator {
    return this.adminNav.getByRole('link', { name: /^users$/i }).first()
  }

  get organizationsLink(): Locator {
    return this.adminNav.getByRole('link', { name: /organizations/i }).first()
  }

  get systemSettingsLink(): Locator {
    return this.adminNav.getByRole('link', { name: /system settings/i }).first()
  }

  get featureFlagsLink(): Locator {
    return this.adminNav.getByRole('link', { name: /feature flags/i }).first()
  }

  get auditLogsLink(): Locator {
    return this.adminNav.getByRole('link', { name: /audit logs/i }).first()
  }

  // ---------------------------------------------------------------------------
  // Members page locators
  // ---------------------------------------------------------------------------

  /**
   * The search input on the members page.
   * The component uses aria-label matching the placeholder text.
   */
  get memberSearch(): Locator {
    return this.page.getByRole('textbox', { name: /search/i }).first()
  }

  /**
   * The members heading — the "Active Members" text shown above the members table.
   * Renders as a generic div (not a heading), so use text-based matching.
   */
  get membersHeading(): Locator {
    return this.page
      .locator('main')
      .getByText(/active members/i)
      .first()
  }

  /**
   * Individual member rows in the table.
   */
  get memberRows(): Locator {
    return this.page.getByRole('row').filter({ hasNotText: /name|email|role/i })
  }

  // ---------------------------------------------------------------------------
  // Org settings page locators
  // ---------------------------------------------------------------------------

  /**
   * The org name input on the settings page (id="org-name").
   */
  get orgNameInput(): Locator {
    return this.page.getByLabel(/organization name|^name$/i).first()
  }

  /**
   * The org slug input on the settings page (id="org-slug").
   */
  get orgSlugInput(): Locator {
    return this.page.getByLabel(/slug/i).first()
  }

  /**
   * The page heading for settings ("Organization Settings").
   */
  get settingsHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 }).first()
  }

  // ---------------------------------------------------------------------------
  // Org switcher (in Header — shows current org name and allows switching)
  // ---------------------------------------------------------------------------

  /**
   * Get the org switcher button by the visible org name text.
   */
  orgSwitcherByName(orgName: string | RegExp): Locator {
    return this.page.locator('header').getByRole('button', { name: orgName })
  }

  /**
   * Org name as displayed in the switcher button (text content).
   * Uses the Locator directly (not a point-in-time snapshot) to avoid
   * a race where the DOM changes between allTextContents() and nth().
   */
  async getCurrentOrgName(): Promise<string | null> {
    const btn = this.getOrgSwitcherLocator()
    const visible = await btn.isVisible().catch(() => false)
    if (!visible) return null
    const text = await btn.textContent()
    if (!text) return null
    return text
      .trim()
      .replace(/[\u{203F}-\u{2040}]|[^\x20-\x7F]/gu, '')
      .trim()
  }

  /**
   * The dropdown menu content that appears when the org switcher is opened.
   */
  get orgDropdownMenu(): Locator {
    return this.page.getByRole('menu')
  }

  /**
   * Switch to a different org by clicking the switcher and selecting by name.
   */
  async switchOrg(orgName: string) {
    const switcherBtn = this.getOrgSwitcherLocator()
    const visible = await switcherBtn.isVisible().catch(() => false)
    if (!visible) return

    await switcherBtn.click()

    // Wait for dropdown and click the target org
    await this.orgDropdownMenu.waitFor({ state: 'visible', timeout: 5_000 })
    await this.orgDropdownMenu.getByRole('menuitem', { name: orgName }).click()

    // Wait for the menu to close
    await this.orgDropdownMenu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
  }

  /**
   * Returns a stable Locator for the org switcher button.
   * Filters to header buttons that have non-empty text content and are not known
   * icon-only utility buttons. Using a Locator avoids the snapshot race that
   * allTextContents() + nth() can produce.
   */
  private getOrgSwitcherLocator(): Locator {
    return this.page
      .locator('header')
      .getByRole('button')
      .filter({ hasText: /\S/ })
      .filter({ hasNotText: ORG_SWITCHER_EXCLUDE })
      .first()
  }

  /**
   * Wait for the org switcher button to appear in the header.
   *
   * The sidebar nav is SSR-rendered and appears immediately, but the header user menu
   * (including the org switcher) is rendered client-side after useSession() loads.
   * Call this before `getCurrentOrgName()` to avoid race conditions.
   */
  async waitForOrgSwitcher(timeout = 15_000): Promise<void> {
    // Wait for a header button that has actual text content (not icon-only) and is not a known
    // utility button. Icon buttons (Language, Toggle theme, GitHub) have empty textContent even
    // though they have an accessible name — so we require at least one non-whitespace character.
    await this.getOrgSwitcherLocator().waitFor({ state: 'visible', timeout })
  }
}
