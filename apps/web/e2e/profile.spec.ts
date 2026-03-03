import { expect, test } from '@playwright/test'
import { ProfilePage } from './profile.page'
import { hasApi, TEST_USER } from './testHelpers'

test.describe('User Profile', () => {
  // Profile tests use the shared authenticated storageState from the setup project.
  // No test.use({ storageState }) override needed — the default applies.
  //
  // mode: 'serial' stops subsequent tests when one fails — prevents later tests
  // from running in unknown DB state. Global CI retries (2) apply at the group level,
  // restarting the whole block from the beginning after afterEach cleanup restores state.
  test.describe.configure({ mode: 'serial' })
  test.skip(() => !hasApi, 'Skipped: no DATABASE_URL in CI')

  test('should display current profile', async ({ page }) => {
    // Arrange + Act
    const profile = new ProfilePage(page)
    await profile.goto()

    // Assert — the display name input has a value (loaded from session/API)
    const nameValue = await profile.displayNameInput.inputValue()
    expect(nameValue.length).toBeGreaterThan(0)
  })

  test('should update display name', async ({ page }) => {
    // Arrange
    const profile = new ProfilePage(page)
    await profile.goto()
    const newName = `E2E Test ${Date.now()}`

    // Act
    await profile.updateName(newName)

    // Assert — a success toast is shown
    await expect(profile.successFeedback).toBeVisible({ timeout: 15_000 })
  })

  test('should show avatar image', async ({ page }) => {
    // Arrange + Act
    const profile = new ProfilePage(page)
    await profile.goto()

    // Assert — an <img> element for the avatar is visible
    const avatar = profile.avatarImage
    await expect(avatar).toBeVisible({ timeout: 15_000 })

    // The src attribute should be populated (DiceBear URL)
    const src = await avatar.getAttribute('src')
    expect(src).toBeTruthy()
    expect(src?.length).toBeGreaterThan(0)
  })

  test('should persist changes after reload', async ({ page }) => {
    // Arrange
    const profile = new ProfilePage(page)
    await profile.goto()
    const newName = `Persist-${Date.now()}`

    // Act — update name, wait for success, then reload
    await profile.updateName(newName)
    await expect(profile.successFeedback).toBeVisible({ timeout: 15_000 })
    await page.reload()
    // Wait for the profile input to re-populate after reload
    await expect(profile.displayNameInput).toHaveValue(newName, { timeout: 15_000 })
  })

  test.afterEach(async ({ page }) => {
    // Restore seed name if a test left a test-generated value.
    // Wait for the save to complete so the next test starts with a clean DB state.
    try {
      const profile = new ProfilePage(page)
      await profile.goto()
      const currentName = await profile.displayNameInput.inputValue()
      if (/^(E2E Test|Persist-)\d+$/.test(currentName)) {
        await profile.updateName(TEST_USER.name)
        // Wait for the save to complete before the next test starts.
        // Without this, the restore save may still be in-flight when the next
        // test navigates, leaving the DB in the test-generated state.
        await expect(profile.successFeedback).toBeVisible({ timeout: 15_000 })
      }
    } catch {
      // Best-effort restore — do not fail the test on cleanup error
    }
  })
})
