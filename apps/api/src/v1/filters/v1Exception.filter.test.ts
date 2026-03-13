import { HttpException, HttpStatus } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { V1ExceptionFilter } from './v1Exception.filter.js'

function makeHost(sendMock: ReturnType<typeof vi.fn>) {
  const statusMock = vi.fn().mockReturnValue({ send: sendMock })
  const response = { status: statusMock }
  return {
    switchToHttp: () => ({ getResponse: () => response }),
    _status: statusMock,
    _send: sendMock,
  }
}

describe('V1ExceptionFilter', () => {
  let filter: V1ExceptionFilter
  let sendMock: ReturnType<typeof vi.fn>
  let host: ReturnType<typeof makeHost>

  beforeEach(() => {
    filter = new V1ExceptionFilter()
    sendMock = vi.fn()
    host = makeHost(sendMock)
  })

  describe('HttpException handling', () => {
    it('formats 400 HttpException into public envelope', () => {
      // Arrange
      const exception = new HttpException('Bad input', HttpStatus.BAD_REQUEST)

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(host._status).toHaveBeenCalledWith(400)
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'BAD_REQUEST', message: 'Bad input', statusCode: 400 },
      })
    })

    it('formats 404 HttpException with NOT_FOUND code', () => {
      // Arrange
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND)

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'NOT_FOUND', message: 'Not found', statusCode: 404 },
      })
    })

    it('formats 401 HttpException with UNAUTHORIZED code', () => {
      // Arrange
      const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized', statusCode: 401 },
      })
    })

    it('formats 403 HttpException with FORBIDDEN code', () => {
      // Arrange
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN)

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'FORBIDDEN', message: 'Forbidden', statusCode: 403 },
      })
    })

    it('formats 409 HttpException with CONFLICT code', () => {
      // Arrange
      const exception = new HttpException('Conflict', HttpStatus.CONFLICT)

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'CONFLICT', message: 'Conflict', statusCode: 409 },
      })
    })

    it('formats 429 HttpException with RATE_LIMIT_EXCEEDED code', () => {
      // Arrange
      const exception = new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS)

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests', statusCode: 429 },
      })
    })

    it('extracts message from object response', () => {
      // Arrange
      const exception = new HttpException({ message: 'Custom message', error: 'Bad Request' }, 400)

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'BAD_REQUEST', message: 'Custom message', statusCode: 400 },
      })
    })

    it('uses errorCode from exception when present', () => {
      // Arrange
      const exception = Object.assign(new HttpException('Conflict', HttpStatus.CONFLICT), {
        errorCode: 'MEMBER_ALREADY_EXISTS',
      })

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'MEMBER_ALREADY_EXISTS', message: 'Conflict', statusCode: 409 },
      })
    })

    it('uses errorCode from response object when present on response', () => {
      // Arrange
      const exception = new HttpException(
        { message: 'Conflict', errorCode: 'MY_CUSTOM_CONFLICT' },
        HttpStatus.CONFLICT
      )

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(sendMock).toHaveBeenCalledWith({
        error: expect.objectContaining({ code: 'MY_CUSTOM_CONFLICT' }),
      })
    })

    it('hides 500 HttpException details and returns generic message', () => {
      // Arrange
      const exception = new HttpException(
        'Internal details exposed',
        HttpStatus.INTERNAL_SERVER_ERROR
      )

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error', statusCode: 500 },
      })
    })
  })

  describe('domain exception (Error with errorCode)', () => {
    it('maps _NOT_FOUND errorCode to 404', () => {
      // Arrange
      const exception = Object.assign(new Error('User not found'), {
        errorCode: 'USER_NOT_FOUND',
      })

      // Act
      filter.catch(exception, host as never)

      // Assert
      // domain exceptions use statusToMessage — raw message is sanitized
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'USER_NOT_FOUND', message: 'Not found', statusCode: 404 },
      })
    })

    it('maps _UNAUTHORIZED errorCode to 401', () => {
      // Arrange
      const exception = Object.assign(new Error('Token invalid'), {
        errorCode: 'TOKEN_UNAUTHORIZED',
      })

      // Act
      filter.catch(exception, host as never)

      // Assert
      // domain exceptions use statusToMessage — raw message is sanitized
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'TOKEN_UNAUTHORIZED', message: 'Unauthorized', statusCode: 401 },
      })
    })

    it('maps _SCOPE_DENIED errorCode to 403', () => {
      // Arrange
      const exception = Object.assign(new Error('Access denied'), {
        errorCode: 'RESOURCE_SCOPE_DENIED',
      })

      // Act
      filter.catch(exception, host as never)

      // Assert
      // domain exceptions use statusToMessage — raw message is sanitized
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'RESOURCE_SCOPE_DENIED', message: 'Forbidden', statusCode: 403 },
      })
    })

    it('maps _ALREADY_ errorCode to 409', () => {
      // Arrange
      const exception = Object.assign(new Error('Member already exists'), {
        errorCode: 'MEMBER_ALREADY_EXISTS',
      })

      // Act
      filter.catch(exception, host as never)

      // Assert
      // domain exceptions use statusToMessage — raw message is sanitized
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'MEMBER_ALREADY_EXISTS', message: 'Conflict', statusCode: 409 },
      })
    })

    it('maps _INVALID errorCode to 400', () => {
      // Arrange
      const exception = Object.assign(new Error('Invalid input'), {
        errorCode: 'EMAIL_INVALID',
      })

      // Act
      filter.catch(exception, host as never)

      // Assert
      // domain exceptions use statusToMessage — raw message is sanitized
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'EMAIL_INVALID', message: 'Bad request', statusCode: 400 },
      })
    })

    it('maps _REVOKED errorCode to 403', () => {
      // Arrange
      const exception = Object.assign(new Error('Key revoked'), {
        errorCode: 'API_KEY_REVOKED',
      })

      // Act
      filter.catch(exception, host as never)

      // Assert
      // domain exceptions use statusToMessage — raw message is sanitized
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'API_KEY_REVOKED', message: 'Forbidden', statusCode: 403 },
      })
    })

    it('maps _VALIDATION errorCode to 400', () => {
      // Arrange
      const exception = Object.assign(new Error('Input validation failed'), {
        errorCode: 'INPUT_VALIDATION',
      })

      // Act
      filter.catch(exception, host as never)

      // Assert
      // domain exceptions use statusToMessage — raw message is sanitized
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'INPUT_VALIDATION', message: 'Bad request', statusCode: 400 },
      })
    })

    it('maps _REQUIRED errorCode to 401', () => {
      // Arrange
      const exception = Object.assign(new Error('API key required'), {
        errorCode: 'API_KEY_REQUIRED',
      })

      // Act
      filter.catch(exception, host as never)

      // Assert
      // domain exceptions use statusToMessage — raw message is sanitized
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'API_KEY_REQUIRED', message: 'Unauthorized', statusCode: 401 },
      })
    })

    it('maps _EXPIRED errorCode to 401', () => {
      // Arrange
      const exception = Object.assign(new Error('Session expired'), {
        errorCode: 'SESSION_EXPIRED',
      })

      // Act
      filter.catch(exception, host as never)

      // Assert
      // domain exceptions use statusToMessage — raw message is sanitized
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'SESSION_EXPIRED', message: 'Unauthorized', statusCode: 401 },
      })
    })

    it('maps _CONFLICT errorCode to 409', () => {
      // Arrange
      const exception = Object.assign(new Error('Email conflict'), {
        errorCode: 'EMAIL_CONFLICT',
      })

      // Act
      filter.catch(exception, host as never)

      // Assert
      // domain exceptions use statusToMessage — raw message is sanitized
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'EMAIL_CONFLICT', message: 'Conflict', statusCode: 409 },
      })
    })

    it('maps _CONSTRAINT errorCode to 403', () => {
      // Arrange
      const exception = Object.assign(new Error('Role constraint violated'), {
        errorCode: 'ROLE_CONSTRAINT',
      })

      // Act
      filter.catch(exception, host as never)

      // Assert
      // domain exceptions use statusToMessage — raw message is sanitized
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'ROLE_CONSTRAINT', message: 'Forbidden', statusCode: 403 },
      })
    })

    it('maps _PROTECTION errorCode to 403', () => {
      // Arrange
      const exception = Object.assign(new Error('Deletion protection active'), {
        errorCode: 'DELETION_PROTECTION',
      })

      // Act
      filter.catch(exception, host as never)

      // Assert
      // domain exceptions use statusToMessage — raw message is sanitized
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'DELETION_PROTECTION', message: 'Forbidden', statusCode: 403 },
      })
    })

    it('hides 500-mapped domain error details', () => {
      // Arrange
      const exception = Object.assign(new Error('DB connection failed'), {
        errorCode: 'DB_FAILURE',
      })

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error', statusCode: 500 },
      })
    })
  })

  describe('unknown error handling', () => {
    it('returns 500 with generic message for plain Error', () => {
      // Arrange
      const exception = new Error('Something went wrong internally')

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(host._status).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error', statusCode: 500 },
      })
    })

    it('returns 500 for non-Error thrown values', () => {
      // Arrange
      const exception = 'string error'

      // Act
      filter.catch(exception, host as never)

      // Assert
      expect(host._status).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error', statusCode: 500 },
      })
    })

    it('returns 500 for null thrown value', () => {
      // Act
      filter.catch(null, host as never)

      // Assert
      expect(host._status).toHaveBeenCalledWith(500)
    })
  })
})
