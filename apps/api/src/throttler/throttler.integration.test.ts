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
async function createTestApp(globalLimit = 3) {
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

  // Register filters globally — ThrottlerExceptionFilter is more specific and must come first
  // so NestJS applies it before the catch-all AllExceptionsFilter
  app.useGlobalFilters(allExceptionsFilter, throttlerExceptionFilter)

  // Register the onSend hook for rate limit headers (shared with bootstrap)
  const { registerRateLimitHeadersHook } = await import('./index.js')
  registerRateLimitHeadersHook(app)

  await app.init()
  await app.getHttpAdapter().getInstance().ready()

  return app
}

/**
 * Helper: make an HTTP request using Fastify's inject() method.
 * This avoids the need for a real TCP server.
 */
async function inject(app: NestFastifyApplication, method: string, url: string) {
  return app.inject({ method: method as 'GET', url })
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
