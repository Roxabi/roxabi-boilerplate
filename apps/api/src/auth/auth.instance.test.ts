import { beforeEach, describe, expect, it, vi } from 'vitest'

// Capture the config passed to betterAuth so we can test databaseHooks
const capturedConfig = vi.hoisted(() => ({
  config: null as Record<string, unknown> | null,
}))

// Capture the config passed to magicLink plugin to test sendMagicLink handler
const capturedMagicLinkConfig = vi.hoisted(() => ({
  config: null as Record<string, unknown> | null,
}))

vi.mock('better-auth', () => ({
  betterAuth: (config: Record<string, unknown>) => {
    capturedConfig.config = config
    return { handler: vi.fn(), api: { getSession: vi.fn() } }
  },
}))

vi.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: vi.fn(() => ({})),
}))

vi.mock('better-auth/plugins/magic-link', () => ({
  magicLink: vi.fn((config: Record<string, unknown>) => {
    capturedMagicLinkConfig.config = config
    return {}
  }),
}))

vi.mock('better-auth/plugins/organization', () => ({
  organization: vi.fn(() => ({})),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ column: _col, value: _val })),
}))

const mockRenderVerificationEmail = vi.fn()
const mockRenderResetEmail = vi.fn()
const mockRenderMagicLinkEmail = vi.fn()

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

vi.mock('@repo/email', () => ({
  escapeHtml: (str: string) => escapeHtml(str),
  renderVerificationEmail: (...args: unknown[]) => mockRenderVerificationEmail(...args),
  renderResetEmail: (...args: unknown[]) => mockRenderResetEmail(...args),
  renderMagicLinkEmail: (...args: unknown[]) => mockRenderMagicLinkEmail(...args),
}))

vi.mock('@nestjs/common', () => {
  class MockLogger {
    error = vi.fn()
    warn = vi.fn()
    log = vi.fn()
  }
  return { Logger: MockLogger }
})

import { createBetterAuth } from './auth.instance.js'

function createMockDb() {
  const whereFn = vi.fn().mockResolvedValue(undefined)
  const setFn = vi.fn().mockReturnValue({ where: whereFn })
  const updateFn = vi.fn().mockReturnValue({ set: setFn })
  const selectWhereFn = vi.fn().mockResolvedValue([])
  const selectFromFn = vi.fn().mockReturnValue({ where: selectWhereFn })
  const selectFn = vi.fn().mockReturnValue({ from: selectFromFn })

  return {
    update: updateFn,
    select: selectFn,
    _mocks: { updateFn, setFn, whereFn, selectFn, selectFromFn, selectWhereFn },
  }
}

function createMockEmailProvider() {
  return { send: vi.fn().mockResolvedValue(undefined) }
}

const defaultConfig = {
  secret: 'test-secret',
  baseURL: 'http://localhost:4000',
  appURL: 'http://localhost:3000',
}

describe('createBetterAuth databaseHooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedConfig.config = null
  })

  it('should set default avatar fields and image URL when user has no image (non-OAuth)', async () => {
    // Arrange
    const mockDb = createMockDb()
    createBetterAuth(mockDb as never, createMockEmailProvider() as never, defaultConfig)

    const hooks = capturedConfig.config?.databaseHooks as {
      user: { create: { after: (user: Record<string, unknown>) => Promise<void> } }
    }
    const afterCreateHook = hooks.user.create.after

    const user = { id: 'user-123', name: 'Test User', image: null }

    // Act
    await afterCreateHook(user)

    // Assert - should set image + avatar fields since user has no image
    expect(mockDb._mocks.setFn).toHaveBeenCalledWith({
      avatarStyle: 'lorelei',
      avatarSeed: 'user-123',
      avatarOptions: {},
      image: 'https://api.dicebear.com/9.x/lorelei/svg?seed=user-123',
    })
  })

  it('should keep existing image but set avatar metadata when user has an image (OAuth)', async () => {
    // Arrange
    const mockDb = createMockDb()
    createBetterAuth(mockDb as never, createMockEmailProvider() as never, defaultConfig)

    const hooks = capturedConfig.config?.databaseHooks as {
      user: { create: { after: (user: Record<string, unknown>) => Promise<void> } }
    }
    const afterCreateHook = hooks.user.create.after

    const user = {
      id: 'user-456',
      name: 'OAuth User',
      image: 'https://lh3.googleusercontent.com/photo.jpg',
    }

    // Act
    await afterCreateHook(user)

    // Assert - should NOT set image (keeps OAuth provider image), but sets avatar metadata
    expect(mockDb._mocks.setFn).toHaveBeenCalledWith({
      avatarStyle: 'lorelei',
      avatarSeed: 'user-456',
      avatarOptions: {},
    })
  })

  it('should use the correct user ID as the DiceBear seed', async () => {
    // Arrange
    const mockDb = createMockDb()
    createBetterAuth(mockDb as never, createMockEmailProvider() as never, defaultConfig)

    const hooks = capturedConfig.config?.databaseHooks as {
      user: { create: { after: (user: Record<string, unknown>) => Promise<void> } }
    }
    const afterCreateHook = hooks.user.create.after

    const user = { id: 'unique-id-789', name: 'Seed User', image: null }

    // Act
    await afterCreateHook(user)

    // Assert - seed in URL and avatarSeed should match user.id
    const setCall = mockDb._mocks.setFn.mock.calls[0]?.[0] as Record<string, unknown>
    expect(setCall.avatarSeed).toBe('unique-id-789')
    expect(setCall.image).toContain('seed=unique-id-789')
  })

  it('should update the correct user row by user.id', async () => {
    // Arrange
    const mockDb = createMockDb()
    createBetterAuth(mockDb as never, createMockEmailProvider() as never, defaultConfig)

    const hooks = capturedConfig.config?.databaseHooks as {
      user: { create: { after: (user: Record<string, unknown>) => Promise<void> } }
    }
    const afterCreateHook = hooks.user.create.after

    const user = { id: 'target-user', name: 'Target', image: null }

    // Act
    await afterCreateHook(user)

    // Assert - update should be called with the users table, where should filter by user.id
    expect(mockDb._mocks.updateFn).toHaveBeenCalled()
    expect(mockDb._mocks.whereFn).toHaveBeenCalled()
  })

  it('should treat empty string image as falsy and set default avatar URL', async () => {
    // Arrange
    const mockDb = createMockDb()
    createBetterAuth(mockDb as never, createMockEmailProvider() as never, defaultConfig)

    const hooks = capturedConfig.config?.databaseHooks as {
      user: { create: { after: (user: Record<string, unknown>) => Promise<void> } }
    }
    const afterCreateHook = hooks.user.create.after

    const user = { id: 'user-empty-img', name: 'Empty Image', image: '' }

    // Act
    await afterCreateHook(user)

    // Assert - empty string is falsy, so image should be set
    expect(mockDb._mocks.setFn).toHaveBeenCalledWith({
      avatarStyle: 'lorelei',
      avatarSeed: 'user-empty-img',
      avatarOptions: {},
      image: 'https://api.dicebear.com/9.x/lorelei/svg?seed=user-empty-img',
    })
  })
})

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------

describe('escapeHtml', () => {
  it('should escape ampersands', () => {
    // Arrange & Act
    const result = escapeHtml('foo & bar')

    // Assert
    expect(result).toBe('foo &amp; bar')
  })

  it('should escape angle brackets', () => {
    // Arrange & Act
    const result = escapeHtml('<script>alert(1)</script>')

    // Assert
    expect(result).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('should escape double quotes', () => {
    // Arrange & Act
    const result = escapeHtml('say "hello"')

    // Assert
    expect(result).toBe('say &quot;hello&quot;')
  })

  it('should escape single quotes', () => {
    // Arrange & Act
    const result = escapeHtml("it's")

    // Assert
    expect(result).toBe('it&#39;s')
  })

  it('should escape all special characters in a single string', () => {
    // Arrange & Act
    const result = escapeHtml('<a href="x" title=\'y\'>&</a>')

    // Assert
    expect(result).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;')
  })

  it('should return the string unchanged when no special characters are present', () => {
    // Arrange & Act
    const result = escapeHtml('hello world')

    // Assert
    expect(result).toBe('hello world')
  })
})

// ---------------------------------------------------------------------------
// sendVerificationEmail handler
// ---------------------------------------------------------------------------

describe('createBetterAuth sendVerificationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedConfig.config = null
    capturedMagicLinkConfig.config = null
  })

  function getVerificationHandler() {
    const emailVerification = capturedConfig.config?.emailVerification as {
      sendVerificationEmail: (params: {
        user: { email: string; locale?: string }
        url: string
      }) => Promise<void>
    }
    return emailVerification.sendVerificationEmail
  }

  it('should render and send verification email with user locale', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getVerificationHandler()

    mockRenderVerificationEmail.mockResolvedValueOnce({
      html: '<p>Verify</p>',
      text: 'Verify your email',
      subject: 'Verify your email',
    })

    // Act
    await handler({
      user: { email: 'user@example.com', locale: 'fr' },
      url: 'http://localhost:4000/api/auth/verify-email?token=abc',
    })

    // Assert — URL should be rewritten to frontend page URL
    expect(mockRenderVerificationEmail).toHaveBeenCalledWith(
      'http://localhost:3000/verify-email?token=abc',
      'fr',
      'http://localhost:3000'
    )
    expect(mockEmail.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Verify your email',
      html: '<p>Verify</p>',
      text: 'Verify your email',
    })
  })

  it('should default to "en" locale when user has no locale', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getVerificationHandler()

    mockRenderVerificationEmail.mockResolvedValueOnce({
      html: '<p>Verify</p>',
      text: 'Verify',
      subject: 'Verify',
    })

    // Act
    await handler({
      user: { email: 'user@example.com' },
      url: 'http://localhost:4000/api/auth/verify-email?token=abc',
    })

    // Assert
    expect(mockRenderVerificationEmail).toHaveBeenCalledWith(
      'http://localhost:3000/verify-email?token=abc',
      'en',
      'http://localhost:3000'
    )
  })

  it('should send fallback email when renderVerificationEmail throws', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getVerificationHandler()

    mockRenderVerificationEmail.mockRejectedValueOnce(new Error('Template render failed'))

    // Act
    await handler({
      user: { email: 'user@example.com' },
      url: 'http://localhost:4000/api/auth/verify-email?token=abc',
    })

    // Assert - should send fallback email with frontend URL
    expect(mockEmail.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Verify your email',
      html: '<p>Click <a href="http://localhost:3000/verify-email?token=abc">here</a> to verify your email.</p>',
      text: 'Verify your email: http://localhost:3000/verify-email?token=abc',
    })
  })

  it('should throw APIError when emailProvider.send fails', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = { send: vi.fn().mockRejectedValue(new Error('Resend down')) }
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getVerificationHandler()

    mockRenderVerificationEmail.mockResolvedValueOnce({
      html: '<p>Verify</p>',
      text: 'Verify',
      subject: 'Verify your email',
    })

    // Act & Assert — send failure surfaces as a controlled APIError, not a raw exception
    await expect(
      handler({
        user: { email: 'user@example.com' },
        url: 'http://localhost:4000/api/auth/verify-email?token=abc',
      })
    ).rejects.toThrow('EMAIL_SEND_FAILED')
  })

  it('should throw APIError when send fails after render also fails', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = { send: vi.fn().mockRejectedValue(new Error('Resend down')) }
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getVerificationHandler()

    mockRenderVerificationEmail.mockRejectedValueOnce(new Error('Render failed'))

    // Act & Assert — double failure still throws APIError (not an unhandled exception)
    await expect(
      handler({
        user: { email: 'user@example.com' },
        url: 'http://localhost:4000/api/auth/verify-email?token=abc',
      })
    ).rejects.toThrow('EMAIL_SEND_FAILED')
  })
})

// ---------------------------------------------------------------------------
// sendResetPassword handler
// ---------------------------------------------------------------------------

describe('createBetterAuth sendResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedConfig.config = null
    capturedMagicLinkConfig.config = null
  })

  function getResetPasswordHandler() {
    const emailAndPassword = capturedConfig.config?.emailAndPassword as {
      sendResetPassword: (params: {
        user: { email: string; locale?: string }
        url: string
      }) => Promise<void>
    }
    return emailAndPassword.sendResetPassword
  }

  it('should render and send reset password email with user locale', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getResetPasswordHandler()

    mockRenderResetEmail.mockResolvedValueOnce({
      html: '<p>Reset</p>',
      text: 'Reset your password',
      subject: 'Reset your password',
    })

    // Act
    await handler({
      user: { email: 'user@example.com', locale: 'fr' },
      url: 'http://localhost:4000/api/auth/reset-password?token=xyz',
    })

    // Assert — URL should be rewritten to frontend page URL
    expect(mockRenderResetEmail).toHaveBeenCalledWith(
      'http://localhost:3000/reset-password/confirm?token=xyz',
      'fr',
      'http://localhost:3000'
    )
    expect(mockEmail.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Reset your password',
      html: '<p>Reset</p>',
      text: 'Reset your password',
    })
  })

  it('should default to "en" locale when user has no locale', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getResetPasswordHandler()

    mockRenderResetEmail.mockResolvedValueOnce({
      html: '<p>Reset</p>',
      text: 'Reset',
      subject: 'Reset',
    })

    // Act
    await handler({
      user: { email: 'user@example.com' },
      url: 'http://localhost:4000/api/auth/reset-password?token=xyz',
    })

    // Assert
    expect(mockRenderResetEmail).toHaveBeenCalledWith(
      'http://localhost:3000/reset-password/confirm?token=xyz',
      'en',
      'http://localhost:3000'
    )
  })

  it('should send fallback email when renderResetEmail throws', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getResetPasswordHandler()

    mockRenderResetEmail.mockRejectedValueOnce(new Error('Render failed'))

    // Act
    await handler({
      user: { email: 'user@example.com' },
      url: 'http://localhost:4000/api/auth/reset-password?token=xyz',
    })

    // Assert - should send fallback email with frontend URL
    expect(mockEmail.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Reset your password',
      html: '<p>Click <a href="http://localhost:3000/reset-password/confirm?token=xyz">here</a> to reset your password.</p>',
      text: 'Reset your password: http://localhost:3000/reset-password/confirm?token=xyz',
    })
  })

  it('should throw APIError when emailProvider.send fails', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = { send: vi.fn().mockRejectedValue(new Error('Resend down')) }
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getResetPasswordHandler()

    mockRenderResetEmail.mockResolvedValueOnce({
      html: '<p>Reset</p>',
      text: 'Reset',
      subject: 'Reset your password',
    })

    // Act & Assert — send failure surfaces as a controlled APIError, not a raw exception
    await expect(
      handler({
        user: { email: 'user@example.com' },
        url: 'http://localhost:4000/api/auth/reset-password?token=xyz',
      })
    ).rejects.toThrow('EMAIL_SEND_FAILED')
  })

  it('should throw APIError when send fails after render also fails', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = { send: vi.fn().mockRejectedValue(new Error('Resend down')) }
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getResetPasswordHandler()

    mockRenderResetEmail.mockRejectedValueOnce(new Error('Render failed'))

    // Act & Assert — double failure still throws APIError (not an unhandled exception)
    await expect(
      handler({
        user: { email: 'user@example.com' },
        url: 'http://localhost:4000/api/auth/reset-password?token=xyz',
      })
    ).rejects.toThrow('EMAIL_SEND_FAILED')
  })
})

// ---------------------------------------------------------------------------
// sendMagicLink handler
// ---------------------------------------------------------------------------

describe('createBetterAuth sendMagicLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedConfig.config = null
    capturedMagicLinkConfig.config = null
  })

  function getMagicLinkHandler() {
    const handler = capturedMagicLinkConfig.config?.sendMagicLink as (params: {
      email: string
      url: string
    }) => Promise<void>
    return handler
  }

  it('should look up user locale from DB and render magic link email', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    mockDb._mocks.selectWhereFn.mockResolvedValueOnce([{ locale: 'fr' }])
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getMagicLinkHandler()

    mockRenderMagicLinkEmail.mockResolvedValueOnce({
      html: '<p>Magic</p>',
      text: 'Sign in',
      subject: 'Sign in to Roxabi',
    })

    // Act
    await handler({
      email: 'user@example.com',
      url: 'http://localhost:4000/api/auth/magic-link/verify?token=m1',
    })

    // Assert — URL should be rewritten to frontend page URL
    expect(mockDb._mocks.selectFn).toHaveBeenCalled()
    expect(mockRenderMagicLinkEmail).toHaveBeenCalledWith(
      'http://localhost:3000/magic-link/verify?token=m1',
      'fr',
      'http://localhost:3000'
    )
    expect(mockEmail.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Sign in to Roxabi',
      html: '<p>Magic</p>',
      text: 'Sign in',
    })
  })

  it('should default to "en" locale when user locale is null', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    mockDb._mocks.selectWhereFn.mockResolvedValueOnce([{ locale: null }])
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getMagicLinkHandler()

    mockRenderMagicLinkEmail.mockResolvedValueOnce({
      html: '<p>Magic EN</p>',
      text: 'Sign in',
      subject: 'Sign in to Roxabi',
    })

    // Act
    await handler({
      email: 'user@example.com',
      url: 'http://localhost:4000/api/auth/magic-link/verify?token=mx',
    })

    // Assert
    expect(mockRenderMagicLinkEmail).toHaveBeenCalledWith(
      'http://localhost:3000/magic-link/verify?token=mx',
      'en',
      'http://localhost:3000'
    )
  })

  it('should throw APIError when user not found in DB', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    mockDb._mocks.selectWhereFn.mockResolvedValueOnce([])
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getMagicLinkHandler()

    // Act & Assert — should reject unregistered emails
    await expect(
      handler({
        email: 'unknown@example.com',
        url: 'http://localhost:4000/api/auth/magic-link/verify?token=m2',
      })
    ).rejects.toThrow('USER_NOT_FOUND')

    // Email should NOT be sent
    expect(mockEmail.send).not.toHaveBeenCalled()
    expect(mockRenderMagicLinkEmail).not.toHaveBeenCalled()
  })

  it('should send fallback email when renderMagicLinkEmail throws', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    mockDb._mocks.selectWhereFn.mockResolvedValueOnce([{ locale: 'en' }])
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getMagicLinkHandler()

    mockRenderMagicLinkEmail.mockRejectedValueOnce(new Error('Render failed'))

    // Act
    await handler({
      email: 'user@example.com',
      url: 'http://localhost:4000/api/auth/magic-link/verify?token=m3',
    })

    // Assert - should send fallback email with frontend URL
    expect(mockEmail.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Sign in to Roxabi',
      html: '<p>Click <a href="http://localhost:3000/magic-link/verify?token=m3">here</a> to sign in.</p>',
      text: 'Sign in to Roxabi: http://localhost:3000/magic-link/verify?token=m3',
    })
  })

  it('should throw APIError when emailProvider.send fails', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = { send: vi.fn().mockRejectedValue(new Error('Resend down')) }
    mockDb._mocks.selectWhereFn.mockResolvedValueOnce([{ locale: 'en' }])
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getMagicLinkHandler()

    mockRenderMagicLinkEmail.mockResolvedValueOnce({
      html: '<p>Magic</p>',
      text: 'Sign in',
      subject: 'Sign in to Roxabi',
    })

    // Act & Assert — send failure surfaces as a controlled APIError, not a raw exception
    await expect(
      handler({
        email: 'user@example.com',
        url: 'http://localhost:4000/api/auth/magic-link/verify?token=m5',
      })
    ).rejects.toThrow('EMAIL_SEND_FAILED')
  })

  it('should throw APIError when send fails after render also fails', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = { send: vi.fn().mockRejectedValue(new Error('Resend down')) }
    mockDb._mocks.selectWhereFn.mockResolvedValueOnce([{ locale: 'en' }])
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getMagicLinkHandler()

    mockRenderMagicLinkEmail.mockRejectedValueOnce(new Error('Render failed'))

    // Act & Assert — double failure still throws APIError (not an unhandled exception)
    await expect(
      handler({
        email: 'user@example.com',
        url: 'http://localhost:4000/api/auth/magic-link/verify?token=m6',
      })
    ).rejects.toThrow('EMAIL_SEND_FAILED')
  })

  it('should propagate error when DB query throws', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    mockDb._mocks.selectWhereFn.mockRejectedValueOnce(new Error('DB error'))
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)
    const handler = getMagicLinkHandler()

    // Act & Assert — DB errors propagate (not caught by email fallback)
    await expect(
      handler({
        email: 'user@example.com',
        url: 'http://localhost:4000/api/auth/magic-link/verify?token=m4',
      })
    ).rejects.toThrow('DB error')

    // Email should NOT be sent
    expect(mockEmail.send).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// buildFrontendUrl (appURL → frontend page URL with token)
// ---------------------------------------------------------------------------

describe('createBetterAuth buildFrontendUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedConfig.config = null
    capturedMagicLinkConfig.config = null
  })

  it('should build frontend verify-email URL from API verification URL', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)

    const emailVerification = capturedConfig.config?.emailVerification as {
      sendVerificationEmail: (params: {
        user: { email: string; locale?: string }
        url: string
      }) => Promise<void>
    }

    mockRenderVerificationEmail.mockResolvedValueOnce({
      html: '<p>Verify</p>',
      text: 'Verify',
      subject: 'Verify',
    })

    // Act — simulate Better Auth URL with token
    await emailVerification.sendVerificationEmail({
      user: { email: 'user@example.com', locale: 'en' },
      url: 'http://localhost:4000/api/auth/verify-email?token=abc&callbackURL=%2F',
    })

    // Assert — URL should be a frontend page URL with token
    expect(mockRenderVerificationEmail).toHaveBeenCalledWith(
      'http://localhost:3000/verify-email?token=abc',
      'en',
      'http://localhost:3000'
    )
  })

  it('should build frontend reset-password URL from API reset URL', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)

    const emailAndPassword = capturedConfig.config?.emailAndPassword as {
      sendResetPassword: (params: {
        user: { email: string; locale?: string }
        url: string
      }) => Promise<void>
    }

    mockRenderResetEmail.mockResolvedValueOnce({
      html: '<p>Reset</p>',
      text: 'Reset',
      subject: 'Reset',
    })

    // Act
    await emailAndPassword.sendResetPassword({
      user: { email: 'user@example.com', locale: 'en' },
      url: 'http://localhost:4000/api/auth/reset-password?token=xyz&callbackURL=%2F',
    })

    // Assert
    expect(mockRenderResetEmail).toHaveBeenCalledWith(
      'http://localhost:3000/reset-password/confirm?token=xyz',
      'en',
      'http://localhost:3000'
    )
  })

  it('should build frontend magic-link URL from API magic link URL', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    mockDb._mocks.selectWhereFn.mockResolvedValueOnce([{ locale: 'en' }])
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)

    const handler = capturedMagicLinkConfig.config?.sendMagicLink as (params: {
      email: string
      url: string
    }) => Promise<void>

    mockRenderMagicLinkEmail.mockResolvedValueOnce({
      html: '<p>Magic</p>',
      text: 'Sign in',
      subject: 'Sign in',
    })

    // Act
    await handler({
      email: 'user@example.com',
      url: 'http://localhost:4000/api/auth/magic-link?token=m1&callbackURL=%2F',
    })

    // Assert
    expect(mockRenderMagicLinkEmail).toHaveBeenCalledWith(
      'http://localhost:3000/magic-link/verify?token=m1',
      'en',
      'http://localhost:3000'
    )
  })

  it('should not rewrite URL when appURL is not configured', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    const configNoApp = { secret: 'test-secret', baseURL: 'http://localhost:4000' }
    createBetterAuth(mockDb as never, mockEmail as never, configNoApp)

    const emailVerification = capturedConfig.config?.emailVerification as {
      sendVerificationEmail: (params: {
        user: { email: string; locale?: string }
        url: string
      }) => Promise<void>
    }

    mockRenderVerificationEmail.mockResolvedValueOnce({
      html: '<p>Verify</p>',
      text: 'Verify',
      subject: 'Verify',
    })

    // Act
    await emailVerification.sendVerificationEmail({
      user: { email: 'user@example.com' },
      url: 'http://localhost:4000/api/auth/verify-email?token=abc&callbackURL=%2F',
    })

    // Assert — URL should remain unchanged
    expect(mockRenderVerificationEmail).toHaveBeenCalledWith(
      'http://localhost:4000/api/auth/verify-email?token=abc&callbackURL=%2F',
      'en',
      undefined
    )
  })

  it('should use frontend URL in fallback email when render throws (reset password)', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)

    const emailAndPassword = capturedConfig.config?.emailAndPassword as {
      sendResetPassword: (params: {
        user: { email: string; locale?: string }
        url: string
      }) => Promise<void>
    }

    mockRenderResetEmail.mockRejectedValueOnce(new Error('Render failed'))

    // Act
    await emailAndPassword.sendResetPassword({
      user: { email: 'user@example.com' },
      url: 'http://localhost:4000/api/auth/reset-password?token=xyz&callbackURL=%2F',
    })

    // Assert — fallback should use the frontend URL
    const frontendUrl = 'http://localhost:3000/reset-password/confirm?token=xyz'
    expect(mockEmail.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Reset your password',
      html: `<p>Click <a href="${escapeHtml(frontendUrl)}">here</a> to reset your password.</p>`,
      text: `Reset your password: ${frontendUrl}`,
    })
  })

  it('should use frontend URL in fallback email when render throws (verification)', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)

    const emailVerification = capturedConfig.config?.emailVerification as {
      sendVerificationEmail: (params: {
        user: { email: string; locale?: string }
        url: string
      }) => Promise<void>
    }

    mockRenderVerificationEmail.mockRejectedValueOnce(new Error('Template render failed'))

    // Act
    await emailVerification.sendVerificationEmail({
      user: { email: 'user@example.com' },
      url: 'http://localhost:4000/api/auth/verify-email?token=abc&callbackURL=%2F',
    })

    // Assert — fallback should use the frontend URL
    const frontendUrl = 'http://localhost:3000/verify-email?token=abc'
    expect(mockEmail.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Verify your email',
      html: `<p>Click <a href="${escapeHtml(frontendUrl)}">here</a> to verify your email.</p>`,
      text: `Verify your email: ${frontendUrl}`,
    })
  })
})

// ---------------------------------------------------------------------------
// buildFrontendUrl edge cases (tested via email handler behavior)
// ---------------------------------------------------------------------------

describe('buildFrontendUrl edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedConfig.config = null
    capturedMagicLinkConfig.config = null
  })

  it('should still build frontend URL when there is no callbackURL parameter but token exists', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)

    const emailVerification = capturedConfig.config?.emailVerification as {
      sendVerificationEmail: (params: {
        user: { email: string; locale?: string }
        url: string
      }) => Promise<void>
    }

    mockRenderVerificationEmail.mockResolvedValueOnce({
      html: '<p>Verify</p>',
      text: 'Verify',
      subject: 'Verify',
    })

    // Act — URL without callbackURL but with token
    await emailVerification.sendVerificationEmail({
      user: { email: 'user@example.com', locale: 'en' },
      url: 'http://localhost:4000/api/auth/verify-email?token=abc',
    })

    // Assert — should build frontend URL from token
    expect(mockRenderVerificationEmail).toHaveBeenCalledWith(
      'http://localhost:3000/verify-email?token=abc',
      'en',
      'http://localhost:3000'
    )
  })

  it('should build frontend URL when appURL is configured', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    createBetterAuth(mockDb as never, mockEmail as never, defaultConfig)

    const emailVerification = capturedConfig.config?.emailVerification as {
      sendVerificationEmail: (params: {
        user: { email: string; locale?: string }
        url: string
      }) => Promise<void>
    }

    mockRenderVerificationEmail.mockResolvedValueOnce({
      html: '<p>Verify</p>',
      text: 'Verify',
      subject: 'Verify',
    })

    // Act — URL with callbackURL parameter and valid appURL
    await emailVerification.sendVerificationEmail({
      user: { email: 'user@example.com', locale: 'en' },
      url: 'http://localhost:4000/api/auth/verify-email?token=abc&callbackURL=%2Fdashboard',
    })

    // Assert — should build frontend URL from token, ignoring callbackURL
    expect(mockRenderVerificationEmail).toHaveBeenCalledWith(
      'http://localhost:3000/verify-email?token=abc',
      'en',
      'http://localhost:3000'
    )
  })

  it('should not rewrite URL when appURL is undefined', async () => {
    // Arrange
    const mockDb = createMockDb()
    const mockEmail = createMockEmailProvider()
    const configNoApp = { secret: 'test-secret', baseURL: 'http://localhost:4000' }
    createBetterAuth(mockDb as never, mockEmail as never, configNoApp)

    const emailAndPassword = capturedConfig.config?.emailAndPassword as {
      sendResetPassword: (params: {
        user: { email: string; locale?: string }
        url: string
      }) => Promise<void>
    }

    mockRenderResetEmail.mockResolvedValueOnce({
      html: '<p>Reset</p>',
      text: 'Reset',
      subject: 'Reset',
    })

    // Act — URL with callbackURL but no appURL configured
    await emailAndPassword.sendResetPassword({
      user: { email: 'user@example.com', locale: 'en' },
      url: 'http://localhost:4000/api/auth/reset-password?token=xyz&callbackURL=%2F',
    })

    // Assert — URL should remain unchanged when appURL is undefined
    expect(mockRenderResetEmail).toHaveBeenCalledWith(
      'http://localhost:4000/api/auth/reset-password?token=xyz&callbackURL=%2F',
      'en',
      undefined
    )
  })
})

// ---------------------------------------------------------------------------
// createBetterAuth configuration
// ---------------------------------------------------------------------------

describe('createBetterAuth configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedConfig.config = null
    capturedMagicLinkConfig.config = null
  })

  it('should include Google social provider when credentials are provided', () => {
    // Arrange
    const config = {
      ...defaultConfig,
      googleClientId: 'google-id',
      googleClientSecret: 'google-secret',
    }

    // Act
    createBetterAuth(createMockDb() as never, createMockEmailProvider() as never, config)

    // Assert
    const socialProviders = capturedConfig.config?.socialProviders as Record<string, unknown>
    expect(socialProviders.google).toEqual({
      clientId: 'google-id',
      clientSecret: 'google-secret',
    })
  })

  it('should include GitHub social provider when credentials are provided', () => {
    // Arrange
    const config = {
      ...defaultConfig,
      githubClientId: 'github-id',
      githubClientSecret: 'github-secret',
    }

    // Act
    createBetterAuth(createMockDb() as never, createMockEmailProvider() as never, config)

    // Assert
    const socialProviders = capturedConfig.config?.socialProviders as Record<string, unknown>
    expect(socialProviders.github).toEqual({
      clientId: 'github-id',
      clientSecret: 'github-secret',
    })
  })

  it('should not include social providers when credentials are missing', () => {
    // Arrange & Act
    createBetterAuth(createMockDb() as never, createMockEmailProvider() as never, defaultConfig)

    // Assert
    const socialProviders = capturedConfig.config?.socialProviders as Record<string, unknown>
    expect(socialProviders.google).toBeUndefined()
    expect(socialProviders.github).toBeUndefined()
  })

  it('should set trustedOrigins from appURL', () => {
    // Arrange & Act
    createBetterAuth(createMockDb() as never, createMockEmailProvider() as never, defaultConfig)

    // Assert
    expect(capturedConfig.config?.trustedOrigins).toEqual(['http://localhost:3000'])
  })

  it('should set empty trustedOrigins when appURL is not provided', () => {
    // Arrange
    const config = { secret: 'test-secret', baseURL: 'http://localhost:4000' }

    // Act
    createBetterAuth(createMockDb() as never, createMockEmailProvider() as never, config)

    // Assert
    expect(capturedConfig.config?.trustedOrigins).toEqual([])
  })
})
