import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('appName', () => {
  it('should return VITE_APP_NAME when set', async () => {
    // Arrange
    vi.stubEnv('VITE_APP_NAME', 'MyBrand')
    vi.resetModules()

    // Act
    const { appName } = await import('./appName')

    // Assert
    expect(appName).toBe('MyBrand')
  })

  it('should fall back to "App" when VITE_APP_NAME is not set', async () => {
    // Arrange — ensure VITE_APP_NAME is absent so the ?? fallback triggers
    vi.stubEnv('VITE_APP_NAME', undefined as unknown as string)
    vi.resetModules()

    // Act
    const { appName } = await import('./appName')

    // Assert
    expect(appName).toBe('App')
  })

  it('should throw when VITE_APP_NAME is an empty string (fails schema validation)', async () => {
    // Arrange — empty string fails the regex /^[\w\s\-.]+$/ in clientEnvSchema
    vi.stubEnv('VITE_APP_NAME', '')
    vi.resetModules()

    // Act & Assert — env.shared module-level parse() throws on invalid value
    await expect(import('./appName')).rejects.toThrow()
  })
})
