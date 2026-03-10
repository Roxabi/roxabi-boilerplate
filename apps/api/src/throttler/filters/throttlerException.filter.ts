import { type ArgumentsHost, Catch, type ExceptionFilter, Injectable, Logger } from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { ErrorCode } from '../../common/errorCodes.js'
import { buildErrorResponse } from '../../common/filters/buildErrorResponse.js'
import { AUTH_SENSITIVE_PATHS, type ThrottlerMeta } from '../index.js'

@Catch(ThrottlerException)
@Injectable()
export class ThrottlerExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ThrottlerExceptionFilter.name)

  constructor(private readonly cls: ClsService) {}

  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    const status = exception.getStatus()
    // biome-ignore lint/suspicious/noExplicitAny: FastifyRequest does not declare throttlerMeta property
    const meta = (request as Record<string, any>).throttlerMeta as ThrottlerMeta | undefined

    const retryAfterSeconds = meta ? Math.max(1, meta.reset - Math.floor(Date.now() / 1000)) : 60

    // Set rate limit headers on 429 responses
    response.header('Retry-After', String(retryAfterSeconds))

    // Suppress X-RateLimit-* headers for auth-sensitive paths to avoid leaking rate limit state
    const path = request.url?.split('?')[0]
    const isAuthSensitive = AUTH_SENSITIVE_PATHS.some(
      (p) => path === p || path?.startsWith(`${p}/`)
    )
    if (meta && !isAuthSensitive) {
      response.header('X-RateLimit-Limit', String(meta.limit))
      response.header('X-RateLimit-Remaining', '0')
      response.header('X-RateLimit-Reset', String(meta.reset))
    }

    const errorResponse = buildErrorResponse({
      statusCode: status,
      path,
      correlationId,
      message: 'Too Many Requests',
      errorCode: ErrorCode.RATE_LIMIT_EXCEEDED,
    })

    // Log at warn level (not error) with structured context
    const tracker = meta?.tracker ?? 'unknown'
    const tierName = meta?.tierName ?? 'unknown'
    this.logger.warn(
      `[${correlationId}] RATE_LIMIT tracker=${tracker} path=${request.url.split('?')[0]} tier=${tierName}`
    )

    response.header('x-correlation-id', correlationId)
    response.status(status).send(errorResponse)
  }
}
