import type { ExecutionContext } from '@nestjs/common'
import {
  ThrottlerException,
  type ThrottlerLimitDetail,
  type ThrottlerRequest,
} from '@nestjs/throttler'
import { describe, expect, it, vi } from 'vitest'

import { AUTH_SENSITIVE_PATHS, CustomThrottlerGuard } from './customThrottler.guard.js'

/**
 * Test subclass that exposes protected methods for unit testing.
 * Eliminates `as any` casts for accessing protected members.
 */
class TestableThrottlerGuard extends CustomThrottlerGuard {
  // biome-ignore lint/suspicious/noExplicitAny: matches @nestjs/throttler ThrottlerGuard.getTracker signature
  public override async getTracker(req: Record<string, any>): Promise<string> {
    return super.getTracker(req)
  }

  public override shouldApplyAuthTier(context: ExecutionContext): boolean {
    return super.shouldApplyAuthTier(context)
  }

  public override async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    return super.handleRequest(requestProps)
  }

  public override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail
  ): Promise<void> {
    return super.throwThrottlingException(context, detail)
  }

  public mockGetRequestResponse(
    fn: (ctx: ExecutionContext) => { req: Record<string, unknown>; res: Record<string, unknown> }
  ): void {
    Object.defineProperty(this, 'getRequestResponse', {
      value: fn,
      writable: true,
      configurable: true,
    })
  }
}

/**
 * Factory: creates a TestableThrottlerGuard with mocked dependencies.
 *
 * ThrottlerGuard requires `options`, `storageService`, and `reflector` injected by NestJS.
 * We set them directly on the prototype to avoid Test.createTestingModule overhead.
 */
function createGuard(overrides: { rateLimitEnabled?: boolean } = {}) {
  const guard = Object.create(TestableThrottlerGuard.prototype) as TestableThrottlerGuard

  // Mock ConfigService via @Inject
  const configService = {
    get: vi.fn((key: string, defaultValue?: unknown) => {
      if (key === 'RATE_LIMIT_ENABLED') return overrides.rateLimitEnabled ?? true
      return defaultValue
    }),
  }
  Object.defineProperty(guard, 'configService', { value: configService, writable: true })

  // Mock storageService (used by handleRequest)
  const storageService = {
    increment: vi.fn().mockResolvedValue({
      totalHits: 1,
      timeToExpire: 60_000,
      isBlocked: false,
      timeToBlockExpire: 0,
    }),
  }
  Object.defineProperty(guard, 'storageService', { value: storageService, writable: true })

  return { guard, configService, storageService }
}

function createMockContext(
  overrides: {
    url?: string
    ip?: string
    user?: { id: string } | null
    session?: { apiKeyId?: string; actorType?: string }
  } = {}
) {
  const req: Record<string, unknown> = {
    url: overrides.url ?? '/api/test',
    ip: overrides.ip ?? '127.0.0.1',
  }
  if (overrides.user !== undefined && overrides.user !== null) {
    req.user = overrides.user
  }
  if (overrides.session !== undefined) {
    req.session = overrides.session
  }

  const context = {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({ header: vi.fn() }),
    }),
  } as unknown as ExecutionContext

  return { context, req }
}

describe('CustomThrottlerGuard', () => {
  describe('getTracker', () => {
    it('should return user-based tracker for authenticated requests', async () => {
      // Arrange
      const { guard } = createGuard()
      const req = { user: { id: 'user-42' }, ip: '10.0.0.1' }

      // Act
      const tracker = await guard.getTracker(req)

      // Assert
      expect(tracker).toBe('user:user-42')
    })

    it('should return IP-based tracker for anonymous requests', async () => {
      // Arrange
      const { guard } = createGuard()
      const req = { ip: '192.168.1.100' }

      // Act
      const tracker = await guard.getTracker(req)

      // Assert
      expect(tracker).toBe('ip:192.168.1.100')
    })

    it('should return IP-based tracker when user has no id', async () => {
      // Arrange
      const { guard } = createGuard()
      const req = { user: {}, ip: '10.0.0.5' }

      // Act
      const tracker = await guard.getTracker(req)

      // Assert
      expect(tracker).toBe('ip:10.0.0.5')
    })
  })

  describe('shouldApplyAuthTier', () => {
    it('should apply auth tier for sign-in path', () => {
      // Arrange
      const { guard } = createGuard()
      const { context } = createMockContext({ url: '/api/auth/sign-in' })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      // Act
      const result = guard.shouldApplyAuthTier(context)

      // Assert
      expect(result).toBe(true)
    })

    it('should apply auth tier for sign-up path', () => {
      // Arrange
      const { guard } = createGuard()
      const { context } = createMockContext({ url: '/api/auth/sign-up' })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      // Act
      const result = guard.shouldApplyAuthTier(context)

      // Assert
      expect(result).toBe(true)
    })

    it('should apply auth tier for password reset paths', () => {
      // Arrange
      const { guard } = createGuard()
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      for (const path of ['/api/auth/request-password-reset', '/api/auth/resetPassword']) {
        const { context } = createMockContext({ url: path })

        // Act
        const result = guard.shouldApplyAuthTier(context)

        // Assert
        expect(result).toBe(true)
      }
    })

    it('should apply auth tier for all auth-sensitive paths', () => {
      // Arrange
      const { guard } = createGuard()
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      // Act + Assert
      for (const path of AUTH_SENSITIVE_PATHS) {
        const { context } = createMockContext({ url: path })
        expect(guard.shouldApplyAuthTier(context)).toBe(true)
      }
    })

    it('should NOT apply auth tier for /api/auth/session', () => {
      // Arrange
      const { guard } = createGuard()
      const { context } = createMockContext({ url: '/api/auth/session' })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      // Act
      const result = guard.shouldApplyAuthTier(context)

      // Assert
      expect(result).toBe(false)
    })

    it('should NOT apply auth tier for /api/auth/providers', () => {
      // Arrange
      const { guard } = createGuard()
      const { context } = createMockContext({ url: '/api/auth/providers' })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      // Act
      const result = guard.shouldApplyAuthTier(context)

      // Assert
      expect(result).toBe(false)
    })

    it('should strip query string before matching', () => {
      // Arrange
      const { guard } = createGuard()
      const { context } = createMockContext({ url: '/api/auth/sign-in?redirect=/dashboard' })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      // Act
      const result = guard.shouldApplyAuthTier(context)

      // Assert
      expect(result).toBe(true)
    })
  })

  describe('rate limit disabled', () => {
    it('should skip throttling when RATE_LIMIT_ENABLED=false', async () => {
      // Arrange
      const { guard } = createGuard({ rateLimitEnabled: false })
      const { context } = createMockContext()

      // Act
      const result = await guard.canActivate(context as never)

      // Assert
      expect(result).toBe(true)
    })
  })

  describe('handleRequest', () => {
    it('should skip auth tier for non-sensitive auth paths', async () => {
      // Arrange
      const { guard, storageService } = createGuard()
      const { context } = createMockContext({ url: '/api/auth/session' })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      const requestProps = {
        context,
        limit: 5,
        ttl: 60_000,
        throttler: { name: 'auth' },
        blockDuration: 300_000,
        generateKey: vi.fn().mockReturnValue('test-key'),
      }

      // Act
      const result = await guard.handleRequest(requestProps as unknown as ThrottlerRequest)

      // Assert -- should return true without calling storageService
      expect(result).toBe(true)
      expect(storageService.increment).not.toHaveBeenCalled()
    })

    it('should store throttlerMeta on request', async () => {
      // Arrange
      const { guard, storageService } = createGuard()
      storageService.increment.mockResolvedValue({
        totalHits: 3,
        timeToExpire: 45_000,
        isBlocked: false,
        timeToBlockExpire: 0,
      })
      const { context, req } = createMockContext({ url: '/api/users' })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      const requestProps = {
        context,
        limit: 60,
        ttl: 60_000,
        throttler: { name: 'global' },
        blockDuration: 0,
        generateKey: vi.fn().mockReturnValue('test-key'),
      }

      // Act
      await guard.handleRequest(requestProps as unknown as ThrottlerRequest)

      // Assert
      expect(req.throttlerMeta).toBeDefined()
      expect(req.throttlerMeta).toMatchObject({
        limit: 60,
        remaining: 57,
        tierName: 'global',
        tracker: 'ip:127.0.0.1',
      })
      expect((req.throttlerMeta as { reset: number }).reset).toBeTypeOf('number')
    })

    it('should throw ThrottlerException when totalHits exceeds limit', async () => {
      // Arrange
      const { guard, storageService } = createGuard()
      storageService.increment.mockResolvedValue({
        totalHits: 61,
        timeToExpire: 30_000,
        isBlocked: false,
        timeToBlockExpire: 0,
      })
      const { context } = createMockContext({ url: '/api/users' })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      const requestProps = {
        context,
        limit: 60,
        ttl: 60_000,
        throttler: { name: 'global' },
        blockDuration: 0,
        generateKey: vi.fn().mockReturnValue('test-key'),
      }

      // Act + Assert
      await expect(
        guard.handleRequest(requestProps as unknown as ThrottlerRequest)
      ).rejects.toThrow(ThrottlerException)
    })

    it('should skip api tier when request has no apiKeyId', async () => {
      // Arrange
      const { guard, storageService } = createGuard()
      const { context } = createMockContext({ url: '/api/users' })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      const requestProps = {
        context,
        limit: 100,
        ttl: 60_000,
        throttler: { name: 'api' },
        blockDuration: 0,
        generateKey: vi.fn().mockReturnValue('test-key'),
      }

      // Act
      const result = await guard.handleRequest(requestProps as unknown as ThrottlerRequest)

      // Assert -- should return true without calling storageService
      expect(result).toBe(true)
      expect(storageService.increment).not.toHaveBeenCalled()
    })

    it('should skip api tier when apiKeyId is an empty string', async () => {
      // Arrange
      const { guard, storageService } = createGuard()
      const { context } = createMockContext({
        url: '/api/users',
        session: { apiKeyId: '', actorType: 'api_key' },
      })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      const requestProps = {
        context,
        limit: 100,
        ttl: 60_000,
        throttler: { name: 'api' },
        blockDuration: 0,
        generateKey: vi.fn().mockReturnValue('test-key'),
      }

      // Act
      const result = await guard.handleRequest(requestProps as unknown as ThrottlerRequest)

      // Assert
      expect(result).toBe(true)
      expect(storageService.increment).not.toHaveBeenCalled()
    })

    it('should use apikey:${keyId} tracker for api tier', async () => {
      // Arrange
      const { guard, storageService } = createGuard()
      const keyId = 'key-uuid-1234'
      const { context } = createMockContext({
        url: '/api/users',
        session: { apiKeyId: keyId, actorType: 'api_key' },
      })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      const generateKey = vi.fn().mockReturnValue('test-key')
      const requestProps = {
        context,
        limit: 100,
        ttl: 60_000,
        throttler: { name: 'api' },
        blockDuration: 0,
        generateKey,
      }

      // Act
      await guard.handleRequest(requestProps as unknown as ThrottlerRequest)

      // Assert -- generateKey called with apikey:${keyId}
      expect(generateKey).toHaveBeenCalledWith(context, `apikey:${keyId}`, 'api')
      expect(storageService.increment).toHaveBeenCalled()
    })

    it('should set throttlerMeta with tierName api', async () => {
      // Arrange
      const { guard, storageService } = createGuard()
      storageService.increment.mockResolvedValue({
        totalHits: 5,
        timeToExpire: 45_000,
        isBlocked: false,
        timeToBlockExpire: 0,
      })
      const keyId = 'key-uuid-5678'
      const { context, req } = createMockContext({
        url: '/api/users',
        session: { apiKeyId: keyId, actorType: 'api_key' },
      })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      const requestProps = {
        context,
        limit: 100,
        ttl: 60_000,
        throttler: { name: 'api' },
        blockDuration: 0,
        generateKey: vi.fn().mockReturnValue('test-key'),
      }

      // Act
      await guard.handleRequest(requestProps as unknown as ThrottlerRequest)

      // Assert
      expect(req.throttlerMeta).toBeDefined()
      expect(req.throttlerMeta).toMatchObject({
        limit: 100,
        remaining: 95,
        tierName: 'api',
        tracker: `apikey:${keyId}`,
      })
      expect((req.throttlerMeta as { reset: number }).reset).toBeTypeOf('number')
    })

    it('should throw ThrottlerException when api tier limit exceeded', async () => {
      // Arrange
      const { guard, storageService } = createGuard()
      storageService.increment.mockResolvedValue({
        totalHits: 101,
        timeToExpire: 30_000,
        isBlocked: false,
        timeToBlockExpire: 0,
      })
      const { context } = createMockContext({
        url: '/api/users',
        session: { apiKeyId: 'key-uuid-exceeded', actorType: 'api_key' },
      })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      const requestProps = {
        context,
        limit: 100,
        ttl: 60_000,
        throttler: { name: 'api' },
        blockDuration: 0,
        generateKey: vi.fn().mockReturnValue('test-key'),
      }

      // Act + Assert
      await expect(
        guard.handleRequest(requestProps as unknown as ThrottlerRequest)
      ).rejects.toThrow(ThrottlerException)
    })

    it('should throw ThrottlerException when api tier isBlocked is true even if under limit', async () => {
      // Arrange
      const { guard, storageService } = createGuard()
      storageService.increment.mockResolvedValue({
        totalHits: 2,
        timeToExpire: 120_000,
        isBlocked: true,
        timeToBlockExpire: 120_000,
      })
      const { context } = createMockContext({
        url: '/api/users',
        session: { apiKeyId: 'key-uuid-blocked', actorType: 'api_key' },
      })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      const requestProps = {
        context,
        limit: 100,
        ttl: 60_000,
        throttler: { name: 'api' },
        blockDuration: 300_000,
        generateKey: vi.fn().mockReturnValue('test-key'),
      }

      // Act + Assert
      await expect(
        guard.handleRequest(requestProps as unknown as ThrottlerRequest)
      ).rejects.toThrow(ThrottlerException)
    })

    it('should throw ThrottlerException when isBlocked is true even if under limit', async () => {
      // Arrange
      const { guard, storageService } = createGuard()
      storageService.increment.mockResolvedValue({
        totalHits: 3,
        timeToExpire: 120_000,
        isBlocked: true,
        timeToBlockExpire: 120_000,
      })
      const { context } = createMockContext({ url: '/api/users' })
      guard.mockGetRequestResponse((ctx) => ({
        req: ctx.switchToHttp().getRequest(),
        res: ctx.switchToHttp().getResponse(),
      }))

      const requestProps = {
        context,
        limit: 60,
        ttl: 60_000,
        throttler: { name: 'global' },
        blockDuration: 300_000,
        generateKey: vi.fn().mockReturnValue('test-key'),
      }

      // Act + Assert
      await expect(
        guard.handleRequest(requestProps as unknown as ThrottlerRequest)
      ).rejects.toThrow(ThrottlerException)
    })
  })

  describe('throwThrottlingException', () => {
    it('should throw ThrottlerException without setting response headers', async () => {
      // Arrange
      const { guard } = createGuard()
      const { context } = createMockContext()
      const headerFn = vi.fn()
      guard.mockGetRequestResponse(() => ({
        req: {},
        res: { header: headerFn },
      }))

      // Act + Assert
      await expect(
        guard.throwThrottlingException(context, {
          limit: 60,
          ttl: 60_000,
          key: 'test-key',
          tracker: 'ip:127.0.0.1',
          totalHits: 61,
          timeToExpire: 30_000,
          isBlocked: false,
          timeToBlockExpire: 0,
        })
      ).rejects.toThrow(ThrottlerException)

      // Verify no headers were set (the filter handles them)
      expect(headerFn).not.toHaveBeenCalled()
    })
  })
})
