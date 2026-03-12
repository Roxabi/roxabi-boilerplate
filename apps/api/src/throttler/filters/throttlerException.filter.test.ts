import { ThrottlerException } from '@nestjs/throttler'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ThrottlerExceptionFilter } from './throttlerException.filter.js'

function createMockCls(id = 'test-correlation-id') {
  return { getId: vi.fn().mockReturnValue(id) }
}

function createMockHost(requestOverrides: Record<string, unknown> = {}) {
  const sendFn = vi.fn()
  const headerFn = vi.fn()
  const statusFn = vi.fn().mockReturnValue({ send: sendFn })

  const request = {
    url: '/api/test',
    ...requestOverrides,
  }
  const response = { status: statusFn, header: headerFn }

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  }

  const getSentBody = () => {
    const call = sendFn.mock.calls[0]
    expect(call).toBeDefined()
    return call?.[0] as Record<string, unknown>
  }

  return { host, statusFn, headerFn, getSentBody } as const
}

describe('ThrottlerExceptionFilter', () => {
  const cls = createMockCls()
  const filter = new ThrottlerExceptionFilter(cls as never)

  beforeEach(() => {
    vi.clearAllMocks()
    ;(cls.getId as ReturnType<typeof vi.fn>).mockReturnValue('test-correlation-id')
  })

  it('should return 429 with correct response shape', () => {
    // Arrange
    const { host, statusFn, getSentBody } = createMockHost()
    const exception = new ThrottlerException()

    // Act
    filter.catch(exception, host as never)

    // Assert
    expect(statusFn).toHaveBeenCalledWith(429)
    const body = getSentBody()
    expect(body.statusCode).toBe(429)
    expect(body.message).toBe('Too Many Requests')
    expect(body.errorCode).toBe('RATE_LIMIT_EXCEEDED')
    expect(body.path).toBe('/api/test')
    expect(body.correlationId).toBe('test-correlation-id')
    expect(body.timestamp).toBeDefined()
  })

  it('should set Retry-After header', () => {
    // Arrange
    const { host, headerFn } = createMockHost()
    const exception = new ThrottlerException()

    // Act
    filter.catch(exception, host as never)

    // Assert
    expect(headerFn).toHaveBeenCalledWith('Retry-After', expect.any(String))
  })

  it('should set X-RateLimit-* headers when meta is present and path is not auth-sensitive', () => {
    // Arrange
    const throttlerMeta = {
      limit: 60,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) + 30,
      tierName: 'global',
      tracker: 'ip:127.0.0.1',
    }
    const { host, headerFn } = createMockHost({ url: '/api/data', throttlerMeta })
    const exception = new ThrottlerException()

    // Act
    filter.catch(exception, host as never)

    // Assert
    expect(headerFn).toHaveBeenCalledWith('X-RateLimit-Limit', '60')
    expect(headerFn).toHaveBeenCalledWith('X-RateLimit-Remaining', '0')
    expect(headerFn).toHaveBeenCalledWith('X-RateLimit-Reset', String(throttlerMeta.reset))
  })

  it('should suppress X-RateLimit-* headers for auth-sensitive paths', () => {
    // Arrange
    const throttlerMeta = {
      limit: 5,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) + 60,
      tierName: 'auth',
      tracker: 'ip:10.0.0.1',
    }
    const { host, headerFn } = createMockHost({
      url: '/api/auth/sign-in',
      throttlerMeta,
    })
    const exception = new ThrottlerException()

    // Act
    filter.catch(exception, host as never)

    // Assert
    const headerCalls = headerFn.mock.calls.map((c) => c[0] as string)
    expect(headerCalls).not.toContain('X-RateLimit-Limit')
    expect(headerCalls).not.toContain('X-RateLimit-Remaining')
    expect(headerCalls).not.toContain('X-RateLimit-Reset')
  })

  it('should log a structured warn with tracker, path, and tier', () => {
    // Arrange
    const throttlerMeta = {
      limit: 5,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) + 60,
      tierName: 'auth',
      tracker: 'ip:10.0.0.1',
    }
    const loggerWarnSpy = vi
      .spyOn((filter as unknown as { logger: { warn: (msg: string) => void } }).logger, 'warn')
      .mockImplementation(() => undefined)
    const { host } = createMockHost({ url: '/api/auth/sign-in', throttlerMeta })
    const exception = new ThrottlerException()

    // Act
    filter.catch(exception, host as never)

    // Assert
    expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('RATE_LIMIT'))
    expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('tracker=ip:10.0.0.1'))
    expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('path=/api/auth/sign-in'))
    expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('tier=auth'))
  })

  it('should default Retry-After to 60 when throttlerMeta is absent', () => {
    // Arrange
    const { host, headerFn } = createMockHost()
    const exception = new ThrottlerException()

    // Act
    filter.catch(exception, host as never)

    // Assert
    expect(headerFn).toHaveBeenCalledWith('Retry-After', '60')
  })

  it('should not set X-RateLimit-* headers when throttlerMeta is absent', () => {
    // Arrange
    const { host, headerFn } = createMockHost()
    const exception = new ThrottlerException()

    // Act
    filter.catch(exception, host as never)

    // Assert
    const headerCalls = headerFn.mock.calls.map((c) => c[0] as string)
    expect(headerCalls).not.toContain('X-RateLimit-Limit')
    expect(headerCalls).not.toContain('X-RateLimit-Remaining')
    expect(headerCalls).not.toContain('X-RateLimit-Reset')
  })

  it('should set x-correlation-id header on 429 response', () => {
    // Arrange
    const { host, headerFn } = createMockHost()
    const exception = new ThrottlerException()

    // Act
    filter.catch(exception, host as never)

    // Assert
    expect(headerFn).toHaveBeenCalledWith('x-correlation-id', 'test-correlation-id')
  })

  it('should use correlation ID from ClsService', () => {
    // Arrange
    const customCls = createMockCls('custom-corr-id')
    const customFilter = new ThrottlerExceptionFilter(customCls as never)
    const { host, getSentBody } = createMockHost()
    const exception = new ThrottlerException()

    // Act
    customFilter.catch(exception, host as never)

    // Assert
    const body = getSentBody()
    expect(body.correlationId).toBe('custom-corr-id')
    expect(customCls.getId).toHaveBeenCalled()
  })

  it('should compute Retry-After from meta.reset when meta is present', () => {
    // Arrange
    const futureReset = Math.floor(Date.now() / 1000) + 45
    const throttlerMeta = {
      limit: 10,
      remaining: 0,
      reset: futureReset,
      tierName: 'global',
      tracker: 'ip:1.2.3.4',
    }
    const { host, headerFn } = createMockHost({ url: '/api/data', throttlerMeta })
    const exception = new ThrottlerException()

    // Act
    filter.catch(exception, host as never)

    // Assert -- Retry-After should be derived from meta.reset (≥ 1 second)
    const retryAfterCall = headerFn.mock.calls.find((c) => c[0] === 'Retry-After')
    expect(retryAfterCall).toBeDefined()
    const retryAfterValue = Number(retryAfterCall?.[1])
    expect(retryAfterValue).toBeGreaterThanOrEqual(1)
    expect(retryAfterValue).toBeLessThanOrEqual(45)
  })

  it('should use API_KEY_RATE_LIMITED error code when tierName is api', () => {
    // Arrange
    const throttlerMeta = {
      limit: 100,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) + 30,
      tierName: 'api',
      tracker: 'apikey:key-uuid-1234',
    }
    const { host, headerFn, getSentBody } = createMockHost({ url: '/api/users', throttlerMeta })
    const exception = new ThrottlerException()

    // Act
    filter.catch(exception, host as never)

    // Assert
    const body = getSentBody()
    expect(body.errorCode).toBe('API_KEY_RATE_LIMITED')
    expect(headerFn).toHaveBeenCalledWith('X-RateLimit-Limit', '100')
    expect(headerFn).toHaveBeenCalledWith('X-RateLimit-Remaining', '0')
    expect(headerFn).toHaveBeenCalledWith('X-RateLimit-Reset', String(throttlerMeta.reset))
  })

  it('should use RATE_LIMIT_EXCEEDED error code for non-api tiers', () => {
    // Arrange
    const throttlerMeta = {
      limit: 60,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) + 30,
      tierName: 'global',
      tracker: 'ip:127.0.0.1',
    }
    const { host, getSentBody } = createMockHost({ url: '/api/users', throttlerMeta })
    const exception = new ThrottlerException()

    // Act
    filter.catch(exception, host as never)

    // Assert
    const body = getSentBody()
    expect(body.errorCode).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('should clamp Retry-After to 1 when meta.reset is in the past', () => {
    // Arrange
    const pastReset = Math.floor(Date.now() / 1000) - 10
    const throttlerMeta = {
      limit: 10,
      remaining: 0,
      reset: pastReset,
      tierName: 'global',
      tracker: 'ip:1.2.3.4',
    }
    const { host, headerFn } = createMockHost({ url: '/api/data', throttlerMeta })
    const exception = new ThrottlerException()

    // Act
    filter.catch(exception, host as never)

    // Assert
    expect(headerFn).toHaveBeenCalledWith('Retry-After', '1')
  })

  it('should strip query string from path in error response', () => {
    // Arrange
    const { host, getSentBody } = createMockHost({ url: '/api/test?token=secret' })
    const exception = new ThrottlerException()

    // Act
    filter.catch(exception, host as never)

    // Assert
    const body = getSentBody()
    expect(body.path).toBe('/api/test')
  })
})
