import { expect, test } from '@playwright/test'
import { ApiKeysPage } from './apiKeys.page'
import { hasApi } from './testHelpers'

test.describe('API Key Management', () => {
  // API key tests use the shared authenticated storageState from the setup project.
  // No test.use({ storageState }) override needed — the default applies.
  test.skip(() => !hasApi, 'Skipped: no DATABASE_URL in CI')

  test('should display API keys page', async ({ page }) => {
    // Arrange + Act
    const apiKeys = new ApiKeysPage(page)
    await apiKeys.goto()

    // Assert — either the create button or the empty-state heading is present
    const [createVisible, emptyStateVisible] = await Promise.all([
      apiKeys.createButton.isVisible().catch(() => false),
      apiKeys.emptyState.isVisible().catch(() => false),
    ])
    expect(createVisible || emptyStateVisible).toBe(true)
  })

  test('should create a new API key and show value once', async ({ page }) => {
    // Arrange
    const apiKeys = new ApiKeysPage(page)
    await apiKeys.goto()
    const keyName = `E2E Key ${Date.now()}`

    // Act
    await apiKeys.createButton.click()
    await apiKeys.keyNameInput.waitFor({ state: 'visible', timeout: 10_000 })
    await apiKeys.keyNameInput.fill(keyName)
    await apiKeys.createConfirmButton.click()

    // Assert — one-time key display is shown with a non-empty key value
    await expect(apiKeys.keyValueDisplay).toBeVisible({ timeout: 15_000 })
    const keyValue = await apiKeys.keyValueDisplay.textContent()
    expect(keyValue).toBeTruthy()
    expect(keyValue?.length).toBeGreaterThan(0)

    // Clean up — close the one-time display
    await apiKeys.oneTimeDoneButton.click()
  })

  test('should show created key in list', async ({ page }) => {
    // Arrange
    const apiKeys = new ApiKeysPage(page)
    await apiKeys.goto()
    const keyName = `Listed Key ${Date.now()}`

    // Act — create the key (helper handles the full creation + close flow)
    await apiKeys.createKey(keyName)

    // Assert — the key name appears somewhere in the page (table row)
    await expect(page.getByText(keyName)).toBeVisible({ timeout: 15_000 })
  })

  test('should mark an API key as revoked', async ({ page }) => {
    // Arrange — create a key to revoke
    const apiKeys = new ApiKeysPage(page)
    await apiKeys.goto()
    const keyName = `Revoke Me ${Date.now()}`
    await apiKeys.createKey(keyName)

    // Verify the key is in the list before revoking
    await expect(page.getByText(keyName)).toBeVisible({ timeout: 15_000 })

    // Act — revoke the key via the confirmation dialog
    await apiKeys.revokeKey(keyName)

    // Assert — after revocation the key stays in the list with a "Revoked" badge.
    // DestructiveConfirmDialog keeps revoked keys visible (status badge only).
    const revokedRow = page.getByRole('row').filter({ hasText: keyName })
    await expect(revokedRow.getByText(/revoked/i)).toBeVisible({ timeout: 15_000 })
  })
})
