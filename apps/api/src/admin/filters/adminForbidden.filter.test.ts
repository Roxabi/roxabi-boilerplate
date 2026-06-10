import { HttpStatus } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { SuperadminProtectionException } from '../exceptions/superadminProtection.exception.js'
import { AdminForbiddenFilter } from './adminForbidden.filter.js'

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createMockCls(correlationId = 'corr-123') {
  return { getId: vi.fn().mockReturnValue(correlationId) }
}

function createMockHost(url = '/api/admin/users/123') {
  const sendFn = vi.fn()
  const headerFn = vi.fn()
  const statusFn = vi.fn().mockReturnValue({ send: sendFn })

  const request = { url }
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

  return { host, statusFn, headerFn, getSentBody }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminForbiddenFilter', () => {
  describe('SuperadminProtectionException', () => {
    it('should respond with 403 status code', () => {
      // Arrange
      const cls = createMockCls()
      const filter = new AdminForbiddenFilter(cls as never)
      const { host, statusFn } = createMockHost()
      const exception = new SuperadminProtectionException()

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(statusFn).toHaveBeenCalledWith(HttpStatus.FORBIDDEN)
    })

    it('should include the exception message and errorCode in the body', () => {
      // Arrange
      const cls = createMockCls()
      const filter = new AdminForbiddenFilter(cls as never)
      const { host, getSentBody } = createMockHost()
      const exception = new SuperadminProtectionException()

      // Act
      filter.catch(exception, host as never)

      // Assert
      const body = getSentBody()
      expect(body.message).toBe('Cannot modify another superadmin account')
      expect(body.errorCode).toBe('SUPERADMIN_PROTECTION')
    })
  })

  describe('Response structure', () => {
    it('should include statusCode, timestamp, path, correlationId, message, and errorCode', () => {
      // Arrange
      const cls = createMockCls('corr-abc')
      const filter = new AdminForbiddenFilter(cls as never)
      const { host, getSentBody } = createMockHost('/api/admin/users/123')
      const exception = new SuperadminProtectionException()

      // Act
      filter.catch(exception, host as never)

      // Assert
      const body = getSentBody()
      expect(body).toEqual({
        statusCode: HttpStatus.FORBIDDEN,
        timestamp: expect.any(String),
        path: '/api/admin/users/123',
        correlationId: 'corr-abc',
        message: expect.any(String),
        errorCode: expect.any(String),
      })
    })

    it('should set x-correlation-id response header', () => {
      // Arrange
      const cls = createMockCls('corr-header-test')
      const filter = new AdminForbiddenFilter(cls as never)
      const { host, headerFn } = createMockHost()
      const exception = new SuperadminProtectionException()

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(headerFn).toHaveBeenCalledWith('x-correlation-id', 'corr-header-test')
    })
  })
})
