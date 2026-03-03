import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { sendErrorResponse } from '../../common/filters/sendErrorResponse.js'
import { ApiKeyExpiryInPastException } from '../exceptions/apiKeyExpiryInPast.exception.js'
import { ApiKeyNotFoundException } from '../exceptions/apiKeyNotFound.exception.js'
import { ApiKeyScopesExceededException } from '../exceptions/apiKeyScopesExceeded.exception.js'

type ApiKeyException =
  | ApiKeyNotFoundException
  | ApiKeyScopesExceededException
  | ApiKeyExpiryInPastException

@Catch(ApiKeyNotFoundException, ApiKeyScopesExceededException, ApiKeyExpiryInPastException)
export class ApiKeyExceptionFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  catch(exception: ApiKeyException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    let statusCode: number
    if (exception instanceof ApiKeyNotFoundException) {
      statusCode = HttpStatus.NOT_FOUND
    } else {
      statusCode = HttpStatus.BAD_REQUEST
    }

    sendErrorResponse(response, request, correlationId, statusCode, exception)
  }
}
