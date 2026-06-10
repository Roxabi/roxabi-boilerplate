import { HttpStatus } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { ApiKeyExpiryInPastException } from '../exceptions/apiKeyExpiryInPast.exception.js'
import { ApiKeyInsertFailedException } from '../exceptions/apiKeyInsertFailed.exception.js'
import { ApiKeyNotFoundException } from '../exceptions/apiKeyNotFound.exception.js'
import { ApiKeyScopesExceededException } from '../exceptions/apiKeyScopesExceeded.exception.js'
import { ApiKeyExceptionFilter } from './apiKeyException.filter.js'

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createMockCls(correlationId = 'corr-123') {
  return { getId: vi.fn().mockReturnValue(correlationId) }
}

function createMockHost(url = '/api/apiKeys') {
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

describe('ApiKeyExceptionFilter', () => {
  describe('ApiKeyNotFoundException', () => {
    it('should respond with 404 status code', () => {
      // Arrange
      const cls = createMockCls()
      const filter = new ApiKeyExceptionFilter(cls as never)
      const { host, statusFn } = createMockHost()
      const exception = new ApiKeyNotFoundException('key-1')

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(statusFn).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
    })

    it('should include the exception message and errorCode in the body', () => {
      // Arrange
      const cls = createMockCls()
      const filter = new ApiKeyExceptionFilter(cls as never)
      const { host, getSentBody } = createMockHost()
      const exception = new ApiKeyNotFoundException('key-1')

      // Act
      filter.catch(exception, host as never)

      // Assert
      const body = getSentBody()
      expect(body.message).toBe('API key "key-1" not found')
      expect(body.errorCode).toBe('API_KEY_NOT_FOUND')
    })
  })

  describe('ApiKeyScopesExceededException', () => {
    it('should respond with 400 status code', () => {
      // Arrange
      const cls = createMockCls()
      const filter = new ApiKeyExceptionFilter(cls as never)
      const { host, statusFn } = createMockHost()
      const exception = new ApiKeyScopesExceededException()

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    })

    it('should include errorCode API_KEY_SCOPES_EXCEEDED in the body', () => {
      // Arrange
      const cls = createMockCls()
      const filter = new ApiKeyExceptionFilter(cls as never)
      const { host, getSentBody } = createMockHost()
      const exception = new ApiKeyScopesExceededException()

      // Act
      filter.catch(exception, host as never)

      // Assert
      const body = getSentBody()
      expect(body.errorCode).toBe('API_KEY_SCOPES_EXCEEDED')
      expect(body.message).toBe('Requested scopes exceed your current permissions')
    })
  })

  describe('ApiKeyExpiryInPastException', () => {
    it('should respond with 400 status code', () => {
      // Arrange
      const cls = createMockCls()
      const filter = new ApiKeyExceptionFilter(cls as never)
      const { host, statusFn } = createMockHost()
      const exception = new ApiKeyExpiryInPastException()

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    })

    it('should include errorCode API_KEY_EXPIRY_IN_PAST in the body', () => {
      // Arrange
      const cls = createMockCls()
      const filter = new ApiKeyExceptionFilter(cls as never)
      const { host, getSentBody } = createMockHost()
      const exception = new ApiKeyExpiryInPastException()

      // Act
      filter.catch(exception, host as never)

      // Assert
      const body = getSentBody()
      expect(body.errorCode).toBe('API_KEY_EXPIRY_IN_PAST')
      expect(body.message).toBe('Expiry date must be in the future')
    })
  })

  describe('ApiKeyInsertFailedException', () => {
    it('should respond with 500 status code', () => {
      // Arrange
      const cls = createMockCls()
      const filter = new ApiKeyExceptionFilter(cls as never)
      const { host, statusFn } = createMockHost()
      const exception = new ApiKeyInsertFailedException()

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(statusFn).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    })

    it('should include errorCode API_KEY_INSERT_FAILED in the body', () => {
      // Arrange
      const cls = createMockCls()
      const filter = new ApiKeyExceptionFilter(cls as never)
      const { host, getSentBody } = createMockHost()
      const exception = new ApiKeyInsertFailedException()

      // Act
      filter.catch(exception, host as never)

      // Assert
      const body = getSentBody()
      expect(body.errorCode).toBe('API_KEY_INSERT_FAILED')
      expect(body.message).toBe('An internal error occurred')
    })
  })

  describe('Response structure', () => {
    it('should include statusCode, timestamp, path, correlationId, message, and errorCode', () => {
      // Arrange
      const cls = createMockCls('corr-abc')
      const filter = new ApiKeyExceptionFilter(cls as never)
      const { host, getSentBody } = createMockHost('/api/api-keys/key-1')
      const exception = new ApiKeyNotFoundException('key-1')

      // Act
      filter.catch(exception, host as never)

      // Assert
      const body = getSentBody()
      expect(body).toEqual({
        statusCode: HttpStatus.NOT_FOUND,
        timestamp: expect.any(String),
        path: '/api/api-keys/key-1',
        correlationId: 'corr-abc',
        message: expect.any(String),
        errorCode: expect.any(String),
      })
    })

    it('should set x-correlation-id response header', () => {
      // Arrange
      const cls = createMockCls('corr-header-test')
      const filter = new ApiKeyExceptionFilter(cls as never)
      const { host, headerFn } = createMockHost()
      const exception = new ApiKeyScopesExceededException()

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(headerFn).toHaveBeenCalledWith('x-correlation-id', 'corr-header-test')
    })

    it('should include a valid ISO timestamp', () => {
      // Arrange
      const cls = createMockCls()
      const filter = new ApiKeyExceptionFilter(cls as never)
      const { host, getSentBody } = createMockHost()
      const exception = new ApiKeyExpiryInPastException()

      // Act
      filter.catch(exception, host as never)

      // Assert
      const body = getSentBody()
      const timestamp = body.timestamp as string
      expect(new Date(timestamp).toISOString()).toBe(timestamp)
    })
  })
})
