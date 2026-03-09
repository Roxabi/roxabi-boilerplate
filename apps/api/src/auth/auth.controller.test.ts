import { describe, expect, it, vi } from 'vitest'

import { AuthController } from './auth.controller.js'

function createMockAuthService(overrides: { enabledProviders?: Record<string, boolean> } = {}) {
  return {
    handler: vi.fn<(req: Request) => Promise<Response>>(),
    enabledProviders: overrides.enabledProviders ?? { google: true, github: false },
  }
}

function createMockRequest(
  overrides: {
    url?: string
    method?: string
    headers?: Record<string, string | string[]>
    body?: unknown
  } = {}
) {
  return {
    url: overrides.url ?? '/api/auth/callback',
    method: overrides.method ?? 'GET',
    headers: {
      host: 'localhost:3000',
      ...overrides.headers,
    },
    body: overrides.body,
  }
}

function createMockReply() {
  const headerStore = new Map<string, string>()
  const sendFn = vi.fn()
  const headerFn = vi.fn((key: string, value: string) => {
    headerStore.set(key, value)
  })
  const statusFn = vi.fn().mockReturnThis()

  const reply = {
    status: statusFn,
    header: headerFn,
    send: sendFn,
  }

  return { reply, statusFn, headerFn, sendFn } as const
}

describe('AuthController', () => {
  describe('getSession', () => {
    it('should return the session object from the @Session() decorator', () => {
      // Arrange
      const authService = createMockAuthService()
      const controller = new AuthController(authService as never)
      const session = {
        user: { id: 'user-1', role: 'user' as const },
        session: { id: 'sess-1', activeOrganizationId: 'org-1' },
        permissions: ['members:read', 'roles:read'],
        actorType: 'user' as const,
      }

      // Act
      const result = controller.getSession(session)

      // Assert
      expect(result).toBe(session)
    })

    it('should return session with empty permissions when no org is active', () => {
      // Arrange
      const authService = createMockAuthService()
      const controller = new AuthController(authService as never)
      const session = {
        user: { id: 'user-1', role: 'user' as const },
        session: { id: 'sess-1', activeOrganizationId: null },
        permissions: [],
        actorType: 'user' as const,
      }

      // Act
      const result = controller.getSession(session)

      // Assert
      expect(result).toEqual({
        user: { id: 'user-1', role: 'user' },
        session: { id: 'sess-1', activeOrganizationId: null },
        permissions: [],
        actorType: 'user',
      })
    })
  })

  describe('getEnabledProviders', () => {
    it('should return the enabled providers from the auth service', () => {
      // Arrange
      const authService = createMockAuthService({
        enabledProviders: { google: true, github: false },
      })
      const controller = new AuthController(authService as never)

      // Act
      const result = controller.getEnabledProviders()

      // Assert
      expect(result).toEqual({ google: true, github: false })
    })

    it('should return all providers as disabled when none are configured', () => {
      // Arrange
      const authService = createMockAuthService({
        enabledProviders: { google: false, github: false },
      })
      const controller = new AuthController(authService as never)

      // Act
      const result = controller.getEnabledProviders()

      // Assert
      expect(result).toEqual({ google: false, github: false })
    })

    it('should return all providers as enabled when all are configured', () => {
      // Arrange
      const authService = createMockAuthService({
        enabledProviders: { google: true, github: true },
      })
      const controller = new AuthController(authService as never)

      // Act
      const result = controller.getEnabledProviders()

      // Assert
      expect(result).toEqual({ google: true, github: true })
    })
  })

  describe('handleAuth', () => {
    it('should build correct URL from Fastify request', async () => {
      // Arrange
      const authService = createMockAuthService()
      const controller = new AuthController(authService as never)
      const req = createMockRequest({
        url: '/api/auth/signin?provider=google',
        headers: { host: 'example.com:8080' },
      })
      const { reply } = createMockReply()

      authService.handler.mockResolvedValue(new Response('ok'))

      // Act
      await controller.handleAuth(req as never, reply as never)

      // Assert
      const fetchRequest = authService.handler.mock.calls[0]?.[0]
      expect(fetchRequest?.url).toBe('http://example.com:8080/api/auth/signin?provider=google')
    })

    it('should forward headers from Fastify to Fetch Request', async () => {
      // Arrange
      const authService = createMockAuthService()
      const controller = new AuthController(authService as never)
      const req = createMockRequest({
        headers: {
          host: 'localhost:3000',
          'content-type': 'application/json',
          authorization: 'Bearer token-123',
          'accept-language': ['en', 'fr'],
        },
      })
      const { reply } = createMockReply()

      authService.handler.mockResolvedValue(new Response('ok'))

      // Act
      await controller.handleAuth(req as never, reply as never)

      // Assert
      const fetchRequest = authService.handler.mock.calls[0]?.[0]
      expect(fetchRequest?.headers.get('content-type')).toBe('application/json')
      expect(fetchRequest?.headers.get('authorization')).toBe('Bearer token-123')
      expect(fetchRequest?.headers.get('accept-language')).toBe('en, fr')
    })

    it('should include body for POST requests', async () => {
      // Arrange
      const authService = createMockAuthService()
      const controller = new AuthController(authService as never)
      const reqBody = { email: 'test@example.com', password: 'secret' }
      const req = createMockRequest({
        method: 'POST',
        body: reqBody,
        headers: { host: 'localhost:3000', 'content-type': 'application/json' },
      })
      const { reply } = createMockReply()

      authService.handler.mockResolvedValue(new Response('ok'))

      // Act
      await controller.handleAuth(req as never, reply as never)

      // Assert
      const fetchRequest = authService.handler.mock.calls[0]?.[0]
      const body = await fetchRequest?.text()
      expect(body).toBe(JSON.stringify(reqBody))
    })

    it('should not include body for GET requests', async () => {
      // Arrange
      const authService = createMockAuthService()
      const controller = new AuthController(authService as never)
      const req = createMockRequest({ method: 'GET' })
      const { reply } = createMockReply()

      authService.handler.mockResolvedValue(new Response('ok'))

      // Act
      await controller.handleAuth(req as never, reply as never)

      // Assert
      const fetchRequest = authService.handler.mock.calls[0]?.[0]
      expect(fetchRequest?.body).toBeNull()
    })

    it('should forward response status code', async () => {
      // Arrange
      const authService = createMockAuthService()
      const controller = new AuthController(authService as never)
      const req = createMockRequest()
      const { reply, statusFn } = createMockReply()

      authService.handler.mockResolvedValue(new Response('', { status: 302 }))

      // Act
      await controller.handleAuth(req as never, reply as never)

      // Assert
      expect(statusFn).toHaveBeenCalledWith(302)
    })

    it('should forward response headers', async () => {
      // Arrange
      const authService = createMockAuthService()
      const controller = new AuthController(authService as never)
      const req = createMockRequest()
      const { reply, headerFn } = createMockReply()

      const responseHeaders = new Headers({
        'set-cookie': 'session=abc123; Path=/',
        location: 'https://example.com/dashboard',
      })
      authService.handler.mockResolvedValue(new Response('', { headers: responseHeaders }))

      // Act
      await controller.handleAuth(req as never, reply as never)

      // Assert
      expect(headerFn).toHaveBeenCalledWith('set-cookie', 'session=abc123; Path=/')
      expect(headerFn).toHaveBeenCalledWith('location', 'https://example.com/dashboard')
    })

    it('should forward response body text', async () => {
      // Arrange
      const authService = createMockAuthService()
      const controller = new AuthController(authService as never)
      const req = createMockRequest()
      const { reply, sendFn } = createMockReply()

      const responseBody = JSON.stringify({ token: 'jwt-token-xyz', user: { id: '1' } })
      authService.handler.mockResolvedValue(new Response(responseBody, { status: 200 }))

      // Act
      await controller.handleAuth(req as never, reply as never)

      // Assert
      expect(sendFn).toHaveBeenCalledWith(responseBody)
    })
  })
})
