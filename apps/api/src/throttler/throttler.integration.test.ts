import { Controller, Get } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { SkipThrottle, ThrottlerModule } from '@nestjs/throttler'
import { ClsModule } from 'nestjs-cls'
import { describe, expect, it } from 'vitest'

import { AllExceptionsFilter } from '../common/filters/allExceptions.filter.js'
import { CustomThrottlerGuard } from './customThrottler.guard.js'
import { ThrottlerExceptionFilter } from './filters/throttlerException.filter.js'

/**
 * Minimal test controller for rate limiting integration tests.
 * Uses in-memory throttler storage (no Redis needed).
 */
@Controller()
class TestController {
  @Get('api/test')
  getTest() {
    return { message: 'ok' }
  }

  @Get('api/auth/sign-in')
  signIn() {
    return { message: 'signed in' }
  }

  @Get('api/auth/session')
  session() {
    return { message: 'session' }
  }

  @Get('api/key-test')
  getKeyTest() {
    return { message: 'ok' }
  }

  @Get('health')
  @SkipThrottle()
  getHealth() {
    return { status: 'ok' }
  }
}

/**
 * Helper: inject the NestJS Fastify app and return a function that makes HTTP requests.
 * Uses app.inject() — Fastify's built-in lightweight HTTP testing (no real TCP server needed).
 */
async function createTestApp(globalLimit = 3, apiLimit = 3, apiKeyId?: string) {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      ClsModule.forRoot({
        global: true,
        middleware: {
          mount: true,
          generateId: true,
        },
      }),
      ThrottlerModule.forRoot({
        throttlers: [
          {
            name: 'global',
            ttl: 60_000,
            limit: globalLimit,
            setHeaders: false,
          },
          {
            name: 'auth',
            ttl: 60_000,
            limit: 2,
            blockDuration: 60_000,
            setHeaders: false,
          },
          {
            name: 'api',
            ttl: 60_000,
            limit: apiLimit,
            setHeaders: false,
          },
        ],
        // No storage = in-memory (default)
      }),
    ],
    controllers: [TestController],
    providers: [{ provide: APP_GUARD, useClass: CustomThrottlerGuard }],
  }).compile()

  // Create filters with ClsService injected explicitly
  const { ClsService } = await import('nestjs-cls')
  const cls = moduleRef.get(ClsService)
  const allExceptionsFilter = new AllExceptionsFilter(cls)
  const throttlerExceptionFilter = new ThrottlerExceptionFilter(cls)

  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter())

  // Register filters globally — NestJS resolves @Catch(ThrottlerException) over @Catch()
  // by specificity, so ThrottlerExceptionFilter handles ThrottlerException regardless of order
  app.useGlobalFilters(allExceptionsFilter, throttlerExceptionFilter)

  // Register the onSend hook for rate limit headers (shared with bootstrap)
  const { registerRateLimitHeadersHook } = await import('./index.js')
  registerRateLimitHeadersHook(app)

  // Register preHandler hook to simulate API key auth on /api/key-test
  // Must be registered before app.init() — Fastify rejects addHook after listening
  if (apiKeyId) {
    app
      .getHttpAdapter()
      .getInstance()
      // biome-ignore lint/suspicious/noExplicitAny: Fastify raw request type
      .addHook('preHandler', (request: any, _reply: any, done: () => void) => {
        if ((request.url as string)?.startsWith('/api/key-test')) {
          const customKeyId = request.headers['x-test-api-key-id'] as string | undefined
          request.session = { apiKeyId: customKeyId ?? apiKeyId, actorType: 'api_key' }
        }
        done()
      })
  }

  await app.init()
  await app.getHttpAdapter().getInstance().ready()

  return app
}

/**
 * Helper: make an HTTP request using Fastify's inject() method.
 * This avoids the need for a real TCP server.
 */
async function inject(
  app: NestFastifyApplication,
  method: string,
  url: string,
  headers?: Record<string, string>
) {
  return app.inject({ method: method as 'GET', url, headers })
}

describe('Rate Limiting Integration', () => {
  it('should return 429 after exceeding global rate limit', async () => {
    // Arrange -- create a fresh app with limit of 2 to isolate this test
    const limitedApp = await createTestApp(2)

    try {
      // Act -- make requests up to and beyond the limit
      const first = await inject(limitedApp, 'GET', '/api/test')
      const second = await inject(limitedApp, 'GET', '/api/test')
      const third = await inject(limitedApp, 'GET', '/api/test')

      // Assert
      expect(first.statusCode).toBe(200)
      expect(second.statusCode).toBe(200)
      expect(third.statusCode).toBe(429)

      const body = JSON.parse(third.body)
      expect(body.message).toBe('Too Many Requests')
      expect(body.errorCode).toBe('RATE_LIMIT_EXCEEDED')
      expect(third.headers['retry-after']).toBeDefined()
    } finally {
      await limitedApp.close()
    }
  })

  it('should include rate limit headers on successful responses', async () => {
    // Arrange -- create a fresh app
    const freshApp = await createTestApp(10)

    try {
      // Act
      const response = await inject(freshApp, 'GET', '/api/test')

      // Assert
      expect(response.statusCode).toBe(200)
      expect(response.headers['x-ratelimit-limit']).toBeDefined()
      expect(response.headers['x-ratelimit-remaining']).toBeDefined()
      expect(response.headers['x-ratelimit-reset']).toBeDefined()
    } finally {
      await freshApp.close()
    }
  })

  it('should omit rate limit headers on auth-sensitive success responses', async () => {
    // Arrange -- create a fresh app
    const freshApp = await createTestApp(10)

    try {
      // Act
      const response = await inject(freshApp, 'GET', '/api/auth/sign-in')

      // Assert
      expect(response.statusCode).toBe(200)
      expect(response.headers['x-ratelimit-limit']).toBeUndefined()
      expect(response.headers['x-ratelimit-remaining']).toBeUndefined()
      expect(response.headers['x-ratelimit-reset']).toBeUndefined()
    } finally {
      await freshApp.close()
    }
  })

  it('should return 429 with API_KEY_RATE_LIMITED when api key exceeds limit', async () => {
    // Arrange -- create a fresh app with api limit of 2, api key pre-set via preHandler
    const apiApp = await createTestApp(100, 2, 'test-key-uuid')

    try {
      // Act -- make requests up to and beyond the api tier limit
      const first = await inject(apiApp, 'GET', '/api/key-test')
      const second = await inject(apiApp, 'GET', '/api/key-test')
      const third = await inject(apiApp, 'GET', '/api/key-test')

      // Assert
      expect(first.statusCode).toBe(200)
      expect(second.statusCode).toBe(200)
      expect(third.statusCode).toBe(429)

      const body = JSON.parse(third.body)
      expect(body.message).toBe('Too Many Requests')
      expect(body.errorCode).toBe('API_KEY_RATE_LIMITED')
      expect(third.headers['retry-after']).toBeDefined()
      expect(third.headers['x-ratelimit-remaining']).toBe('0')
    } finally {
      await apiApp.close()
    }
  })

  it('should include X-RateLimit-* headers on API key success responses', async () => {
    // Arrange -- create a fresh app with a high api limit, api key pre-set via preHandler
    const apiApp = await createTestApp(100, 100, 'test-key-headers')

    try {
      // Act
      const response = await inject(apiApp, 'GET', '/api/key-test')

      // Assert
      expect(response.statusCode).toBe(200)
      expect(response.headers['x-ratelimit-limit']).toBeDefined()
      expect(response.headers['x-ratelimit-remaining']).toBeDefined()
      const resetValue = Number(response.headers['x-ratelimit-reset'])
      expect(resetValue).toBeGreaterThan(Math.floor(Date.now() / 1000))
      expect(resetValue).toBeLessThan(Math.floor(Date.now() / 1000) + 120)
    } finally {
      await apiApp.close()
    }
  })

  it('should track api keys independently', async () => {
    const apiApp = await createTestApp(100, 2, 'key-a')

    try {
      // Exhaust key A
      await inject(apiApp, 'GET', '/api/key-test')
      await inject(apiApp, 'GET', '/api/key-test')
      const keyAThird = await inject(apiApp, 'GET', '/api/key-test')
      expect(keyAThird.statusCode).toBe(429)

      // Key B should still be allowed
      const keyBFirst = await inject(apiApp, 'GET', '/api/key-test', {
        'x-test-api-key-id': 'key-b',
      })
      expect(keyBFirst.statusCode).toBe(200)
    } finally {
      await apiApp.close()
    }
  })

  it('should not apply api tier to non-API-key requests', async () => {
    // Arrange -- create app with very low api limit (no apiKeyId set on session)
    const apiApp = await createTestApp(10, 1)
    // No registerApiKeyHook — requests go without session.apiKeyId

    try {
      // Act -- make multiple requests beyond api limit; should still succeed (global limit is 10)
      const first = await inject(apiApp, 'GET', '/api/key-test')
      const second = await inject(apiApp, 'GET', '/api/key-test')

      // Assert -- both should succeed because api tier is skipped for non-API-key requests
      expect(first.statusCode).toBe(200)
      expect(second.statusCode).toBe(200)
    } finally {
      await apiApp.close()
    }
  })

  it('should exempt health endpoint from rate limiting', async () => {
    // Arrange -- create an app with a very low limit
    const limitedApp = await createTestApp(1)

    try {
      // Use up the global limit on a regular endpoint
      await inject(limitedApp, 'GET', '/api/test')
      // This would be blocked if health were rate-limited
      const healthResponse = await inject(limitedApp, 'GET', '/health')

      // Assert -- health endpoint should still return 200
      expect(healthResponse.statusCode).toBe(200)
      const body = JSON.parse(healthResponse.body)
      expect(body.status).toBe('ok')
    } finally {
      await limitedApp.close()
    }
  })
})
