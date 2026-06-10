import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { buildErrorResponse } from './buildErrorResponse.js'

function hasMessage(body: unknown): body is { message: string | string[] } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    (typeof (body as Record<string, unknown>).message === 'string' ||
      Array.isArray((body as Record<string, unknown>).message))
  )
}

function hasErrorCode(value: unknown): value is { errorCode: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'errorCode' in value &&
    typeof (value as Record<string, unknown>).errorCode === 'string'
  )
}

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: Logger

  constructor(
    private readonly cls: ClsService,
    @Optional() logger?: Logger
  ) {
    this.logger = logger ?? new Logger(AllExceptionsFilter.name)
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()

    const correlationId = this.cls.getId()

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    let message: string | string[]
    if (exception instanceof HttpException) {
      const body = exception.getResponse()
      if (typeof body === 'string') {
        message = body
      } else if (hasMessage(body)) {
        message = body.message
      } else {
        message = HttpStatus[status] || 'Error'
      }
    } else {
      message = 'Internal server error'
    }

    const errorCode = hasErrorCode(exception) ? exception.errorCode : undefined

    const errorResponse = buildErrorResponse({
      statusCode: status,
      path: request.url,
      correlationId,
      message,
      errorCode,
    })

    this.logException(exception, request, correlationId, status)

    response.header('x-correlation-id', correlationId)
    response.status(status).send(errorResponse)
  }

  private logException(
    exception: unknown,
    request: { method: string; url: string },
    correlationId: string,
    status: number
  ) {
    const label = `[${correlationId}] ${request.method} ${request.url.split('?')[0]} - ${status}`
    if (status >= 500) {
      this.logger.error(label, exception instanceof Error ? exception.stack : undefined)
    } else {
      this.logger.warn(
        `${label} - ${exception instanceof Error ? exception.message : String(exception)}`
      )
    }
  }
}
