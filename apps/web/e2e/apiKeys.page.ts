import type { Locator, Page } from '@playwright/test'

/**
 * Page Object Model for the API Key Management page (/settings/api-keys).
 *
 * Encapsulates locators and helpers for the API key list, creation dialog,
 * one-time key display, and revoke dialog.
 * No assertions inside this class — tests assert on the returned values.
 */
export class ApiKeysPage {
  constructor(private page: Page) {}

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async goto() {
    await this.page.goto('/settings/api-keys')
    // Wait for either the table (keys exist) or the empty state (dashed border)
    await this.page.waitForSelector('table, [class*="border-dashed"]', {
      timeout: 15_000,
    })
  }

  // ---------------------------------------------------------------------------
  // List / table locators
  // ---------------------------------------------------------------------------

  /**
   * The table element rendered when there are existing keys.
   */
  get keysList(): Locator {
    return this.page.locator('table').first()
  }

  /**
   * The empty-state container shown when no keys exist (dashed border div).
   */
  get emptyState(): Locator {
    return this.page.locator('[class*="border-dashed"]').first()
  }

  /**
   * The "Create API Key" button shown in the list header when keys exist,
   * or the "Create your first API key" button inside the empty state.
   */
  get createButton(): Locator {
    return this.page.getByRole('button', { name: /create/i }).first()
  }

  // ---------------------------------------------------------------------------
  // Create dialog locators
  // ---------------------------------------------------------------------------

  /**
   * The key name input inside the Create Key dialog.
   * Corresponds to `input#api-key-name` in CreateKeyFormFields.
   */
  get keyNameInput(): Locator {
    return this.page.locator('input#api-key-name')
  }

  /**
   * The "Create" submit button inside the Create Key dialog (not the cancel button).
   */
  get createConfirmButton(): Locator {
    return this.page.getByRole('button', { name: /^create$/i }).first()
  }

  // ---------------------------------------------------------------------------
  // One-time key display locators
  // ---------------------------------------------------------------------------

  /**
   * The <code> element inside the OneTimeKeyDisplay dialog that shows the raw key value.
   */
  get keyValueDisplay(): Locator {
    return this.page.locator('[data-slot="dialog-content"] code').first()
  }

  /**
   * The "Done" button in the OneTimeKeyDisplay dialog to close it.
   */
  get oneTimeDoneButton(): Locator {
    return this.page.getByRole('button', { name: /done/i }).first()
  }

  // ---------------------------------------------------------------------------
  // Revoke dialog locators
  // ---------------------------------------------------------------------------

  /**
   * Returns the Revoke button for a specific key by its displayed name in the table.
   * The revoke button is in the rightmost column of the key's table row.
   */
  revokeButton(keyName: string): Locator {
    return this.page
      .getByRole('row')
      .filter({ hasText: keyName })
      .getByRole('button', { name: /revoke/i })
  }

  /**
   * The confirm input inside the DestructiveConfirmDialog (type the key name to confirm).
   * The component uses AlertDialog which renders as role="alertdialog", not "dialog".
   */
  get revokeConfirmInput(): Locator {
    return this.page.getByRole('alertdialog').locator('input').first()
  }

  /**
   * The destructive "Revoke" confirm button inside the DestructiveConfirmDialog.
   * RevokeKeyDialog passes actionLabel="Revoke" to DestructiveConfirmDialog.
   */
  get revokeConfirmButton(): Locator {
    return this.page.getByRole('alertdialog').getByRole('button', { name: /revoke/i })
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Open the create dialog, fill the key name, submit, wait for the one-time
   * key display, capture the key value, then close the dialog.
   *
   * Returns the one-time key value text.
   */
  async createKey(name: string): Promise<string> {
    await this.createButton.click()
    await this.keyNameInput.waitFor({ state: 'visible', timeout: 10_000 })
    await this.keyNameInput.fill(name)
    await this.createConfirmButton.click()

    // Wait for the one-time key display dialog
    await this.keyValueDisplay.waitFor({ state: 'visible', timeout: 15_000 })
    const keyValue = (await this.keyValueDisplay.textContent()) ?? ''

    // Close the one-time key display
    await this.oneTimeDoneButton.click()
    await this.keyValueDisplay.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {
      // Dialog may already be gone
    })

    return keyValue
  }

  /**
   * Click the Revoke button for the given key name, type the key name in the
   * confirmation input, then click the destructive confirm button.
   */
  async revokeKey(keyName: string) {
    await this.revokeButton(keyName).click()
    await this.revokeConfirmInput.waitFor({ state: 'visible', timeout: 10_000 })
    await this.revokeConfirmInput.fill(keyName)
    await this.revokeConfirmButton.click()
  }
}
