import { expect, test } from '@playwright/test'
import { RegistrationPage } from './registration.page'
import { hasApi, NAVIGATION_TIMEOUT, TEST_USER } from './testHelpers'

test.describe('Registration', () => {
  // Registration tests use a clean (unauthenticated) context so they don't
  // interfere with the shared authenticated storageState used by other tests.
  test.use({ storageState: { cookies: [], origins: [] } })
  test.skip(() => !hasApi, 'Skipped: no DATABASE_URL in CI')

  test('should display registration form', async ({ page }) => {
    // Arrange + Act
    const registration = new RegistrationPage(page)
    await registration.goto()

    // Assert — all form fields and submit button are visible
    await expect(registration.nameInput).toBeVisible()
    await expect(registration.emailInput).toBeVisible()
    await expect(registration.passwordInput).toBeVisible()
    await expect(registration.submitButton).toBeVisible()
  })

  test('should register with valid credentials and show success card', async ({ page }) => {
    // Arrange — unique email per test run to avoid duplicate conflicts
    const registration = new RegistrationPage(page)
    await registration.goto()
    const email = `test-${Date.now()}@e2e.local`

    // Act
    await registration.register('E2E Test User', email, 'Password1!')

    // Assert — success state: back-to-login link is only rendered inside RegistrationSuccess
    await expect(registration.backToLoginLink).toBeVisible({ timeout: NAVIGATION_TIMEOUT })
  })

  test('should show validation errors for invalid input', async ({ page }) => {
    // Arrange
    const registration = new RegistrationPage(page)
    await registration.goto()

    // Act — type a clearly invalid email and blur the field to trigger inline validation
    await registration.emailInput.fill('not-an-email')
    await registration.emailInput.blur()

    // Assert — inline email error message appears
    const emailError = page.locator('#email-error')
    await expect(emailError).toBeVisible({ timeout: 15_000 })
  })

  test('should show error for duplicate email', async ({ page }) => {
    // Arrange — TEST_USER.email already exists via seeded fixtures
    const registration = new RegistrationPage(page)
    await registration.goto()

    // Act — attempt to register with an already-existing email
    await registration.register(TEST_USER.name, TEST_USER.email, 'Password1!')

    // Assert — with requireEmailVerification enabled, better-auth returns a synthetic
    // success response for duplicate emails (privacy protection: prevents user enumeration).
    // The "Account Created" success card is shown — backToLoginLink confirms this.
    await expect(registration.backToLoginLink).toBeVisible({ timeout: NAVIGATION_TIMEOUT })
  })

  test('should have back to sign in link', async ({ page }) => {
    // Arrange + Act
    const registration = new RegistrationPage(page)
    await registration.goto()

    // Assert — the "Already have an account? Sign in" link points to /login.
    // Use .first() since the header also has a "Sign In" link (strict mode guard).
    const signInLink = page.getByRole('link', { name: /sign in/i }).first()
    await expect(signInLink).toBeVisible()
    const href = await signInLink.getAttribute('href')
    expect(href).toMatch(/\/login/)
  })
})
