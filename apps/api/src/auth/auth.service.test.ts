import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthService } from './auth.service.js'

const mockHandler = vi.fn()
const mockGetSession = vi.fn()

// vi.mock is required here because createBetterAuth is called inside the constructor,
// not injected via DI, so it cannot be stubbed through dependency injection.
vi.mock('./auth.instance.js', () => ({
  createBetterAuth: vi.fn(() => ({
    handler: mockHandler,
    api: { getSession: mockGetSession },
  })),
}))

function createMockConfig(values: Record<string, string | undefined> = {}) {
  return {
    get: vi.fn((key: string, defaultValue?: string) => values[key] ?? defaultValue),
    getOrThrow: vi.fn((key: string) => {
      const value = values[key]
      if (value === undefined) throw new Error(`Missing config key: ${key}`)
      return value
    }),
  }
}

const mockEventEmitter = { emit: vi.fn(), emitAsync: vi.fn().mockResolvedValue([]) }

const baseConfigValues = {
  BETTER_AUTH_SECRET: 'test-secret',
  BETTER_AUTH_URL: 'http://localhost:4000',
  APP_URL: 'http://localhost:3000',
}

function createService(config: ReturnType<typeof createMockConfig>) {
  return new AuthService({} as never, {} as never, config as never, mockEventEmitter as never)
}

describe('AuthService', () => {
  beforeEach(() => {
    mockHandler.mockReset()
    mockGetSession.mockReset()
    mockEventEmitter.emit.mockReset()
    mockEventEmitter.emitAsync.mockReset().mockResolvedValue([])
  })

  describe('constructor', () => {
    it('should detect enabled OAuth providers from config', () => {
      // Arrange
      const config = createMockConfig({
        ...baseConfigValues,
        GOOGLE_CLIENT_ID: 'google-id',
        GOOGLE_CLIENT_SECRET: 'google-secret',
      })

      // Act
      // db and emailProvider are passed through to mocked createBetterAuth, so empty stubs are safe
      const service = createService(config)

      // Assert
      expect(service.enabledProviders).toEqual({
        google: true,
        github: false,
      })
    })

    it('should report no providers when none are configured', () => {
      // Arrange
      const config = createMockConfig(baseConfigValues)

      // Act
      const service = createService(config)

      // Assert
      expect(service.enabledProviders).toEqual({
        google: false,
        github: false,
      })
    })

    it('should require both client ID and secret for a provider to be enabled', () => {
      // Arrange — only ID, no secret
      const config = createMockConfig({
        ...baseConfigValues,
        GITHUB_CLIENT_ID: 'gh-id',
      })

      // Act
      const service = createService(config)

      // Assert
      expect(service.enabledProviders.github).toBe(false)
    })

    it('should throw when BETTER_AUTH_SECRET is missing', () => {
      // Arrange
      const config = createMockConfig({})

      // Act & Assert
      expect(() => createService(config)).toThrow('Missing config key: BETTER_AUTH_SECRET')
    })
  })

  describe('handler', () => {
    it('should delegate to the BetterAuth handler', async () => {
      // Arrange
      const config = createMockConfig(baseConfigValues)
      const service = createService(config)
      const mockRequest = new Request('http://localhost:4000/api/auth/signin')
      const mockResponse = new Response('ok')
      mockHandler.mockResolvedValue(mockResponse)

      // Act
      const result = await service.handler(mockRequest)

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(mockRequest)
      expect(result).toBe(mockResponse)
    })
  })

  describe('getRawSession', () => {
    it('should convert Fastify headers and delegate to BetterAuth API', async () => {
      // Arrange
      const config = createMockConfig(baseConfigValues)
      const service = createService(config)
      const mockFastifyRequest = {
        headers: {
          cookie: 'session=abc123',
          host: 'localhost:3001',
        },
      }
      const mockSession = { user: { id: 'user-1' }, session: { id: 'sess-1' } }
      mockGetSession.mockResolvedValue(mockSession)

      // Act
      const result = await service.getRawSession(mockFastifyRequest as never)

      // Assert
      expect(mockGetSession).toHaveBeenCalledWith({
        headers: expect.any(Headers),
      })
      const calledHeaders = mockGetSession.mock.calls[0]?.[0]?.headers as Headers
      expect(calledHeaders.get('cookie')).toBe('session=abc123')
      expect(result).toBe(mockSession)
    })

    it('should return null when no session exists', async () => {
      // Arrange
      const config = createMockConfig(baseConfigValues)
      const service = createService(config)
      const mockFastifyRequest = { headers: {} }
      mockGetSession.mockResolvedValue(null)

      // Act
      const result = await service.getRawSession(mockFastifyRequest as never)

      // Assert
      expect(result).toBeNull()
    })
  })
})
