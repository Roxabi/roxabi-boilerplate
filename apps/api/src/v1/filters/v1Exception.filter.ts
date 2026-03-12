import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import type { FastifyReply } from 'fastify'

interface ErrorWithCode {
  errorCode: string
}

function hasErrorCode(value: unknown): value is ErrorWithCode {
  return typeof value === 'object' && value !== null && 'errorCode' in value
}

function extractMessage(res: string | object): string | undefined {
  if (typeof res === 'string') return res
  if (typeof res === 'object' && res !== null && 'message' in res) {
    const msg = (res as Record<string, unknown>).message
    if (typeof msg === 'string') return msg
  }
}

@Catch()
export class V1ExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    let code = 'INTERNAL_ERROR'
    let message = 'Internal server error'

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const res = exception.getResponse()
      message = extractMessage(res) ?? exception.message
      const exErrorCode = hasErrorCode(exception) ? exception.errorCode : null
      const resErrorCode =
        typeof res === 'object' && res !== null && hasErrorCode(res) ? res.errorCode : null
      code = exErrorCode ?? resErrorCode ?? this.statusToCode(statusCode)
    } else if (exception instanceof Error && hasErrorCode(exception)) {
      code = exception.errorCode
      message = exception.message
      statusCode = this.errorCodeToStatus(code)
    }

    if (statusCode >= 500) {
      message = 'Internal server error'
      code = 'INTERNAL_ERROR'
    }

    response.status(statusCode).send({
      error: { code, message, statusCode },
    })
  }

  private errorCodeToStatus(code: string): number {
    if (code.endsWith('_NOT_FOUND')) return HttpStatus.NOT_FOUND
    if (
      code.endsWith('_UNAUTHORIZED') ||
      code.endsWith('_INVALID') ||
      code.endsWith('_REQUIRED') ||
      code.endsWith('_REVOKED') ||
      code.endsWith('_EXPIRED')
    )
      return HttpStatus.UNAUTHORIZED
    if (
      code.endsWith('_SCOPE_DENIED') ||
      code.endsWith('_CONSTRAINT') ||
      code.endsWith('_PROTECTION')
    )
      return HttpStatus.FORBIDDEN
    if (code.endsWith('_CONFLICT') || code.includes('_ALREADY_')) return HttpStatus.CONFLICT
    if (code.endsWith('_VALIDATION') || code.endsWith('_IN_PAST')) return HttpStatus.BAD_REQUEST
    return HttpStatus.INTERNAL_SERVER_ERROR
  }

  private statusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST'
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED'
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN'
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND'
      case HttpStatus.CONFLICT:
        return 'CONFLICT'
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_EXCEEDED'
      default:
        return 'INTERNAL_ERROR'
    }
  }
}
