import { HttpStatus } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { NotDeletedException } from '../exceptions/notDeleted.exception.js'
import { AdminBadRequestFilter } from './adminBadRequest.filter.js'

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createMockCls(correlationId = 'corr-123') {
  return { getId: vi.fn().mockReturnValue(correlationId) }
}

function createMockHost(url = '/api/admin/users/123/restore') {
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

describe('AdminBadRequestFilter', () => {
  describe('NotDeletedException', () => {
    it('should respond with 400 status code', () => {
      // Arrange
      const cls = createMockCls()
      const filter = new AdminBadRequestFilter(cls as never)
      const { host, statusFn } = createMockHost()
      const exception = new NotDeletedException('user', 'user-123')

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    })

    it('should include the exception message and errorCode in the body', () => {
      // Arrange
      const cls = createMockCls()
      const filter = new AdminBadRequestFilter(cls as never)
      const { host, getSentBody } = createMockHost()
      const exception = new NotDeletedException('user', 'user-123')

      // Act
      filter.catch(exception, host as never)

      // Assert
      const body = getSentBody()
      expect(body.message).toBe('user user-123 is not deleted')
      expect(body.errorCode).toBe('NOT_DELETED')
    })
  })

  describe('Response structure', () => {
    it('should include statusCode, timestamp, path, correlationId, message, and errorCode', () => {
      // Arrange
      const cls = createMockCls('corr-abc')
      const filter = new AdminBadRequestFilter(cls as never)
      const { host, getSentBody } = createMockHost('/api/admin/users/123/restore')
      const exception = new NotDeletedException('user', 'user-123')

      // Act
      filter.catch(exception, host as never)

      // Assert
      const body = getSentBody()
      expect(body).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: '/api/admin/users/123/restore',
        correlationId: 'corr-abc',
        message: expect.any(String),
        errorCode: expect.any(String),
      })
    })

    it('should set x-correlation-id response header', () => {
      // Arrange
      const cls = createMockCls('corr-header-test')
      const filter = new AdminBadRequestFilter(cls as never)
      const { host, headerFn } = createMockHost()
      const exception = new NotDeletedException('user', 'user-123')

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(headerFn).toHaveBeenCalledWith('x-correlation-id', 'corr-header-test')
    })
  })
})
