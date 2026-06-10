import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus, Logger } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { sendErrorResponse } from '../../common/filters/sendErrorResponse.js'
import { ConsentInsertFailedException } from '../exceptions/consentInsertFailed.exception.js'
import { ConsentNotFoundException } from '../exceptions/consentNotFound.exception.js'

type ConsentException = ConsentNotFoundException | ConsentInsertFailedException

@Catch(ConsentNotFoundException, ConsentInsertFailedException)
export class ConsentExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ConsentExceptionFilter.name)

  constructor(private readonly cls: ClsService) {}

  catch(exception: ConsentException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    let statusCode: number
    if (exception instanceof ConsentNotFoundException) {
      statusCode = HttpStatus.NOT_FOUND
      this.logger.warn(
        `[${correlationId}] Consent not found for userId=${exception.getUserId()} ${request.method} ${request.url}`
      )
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR
      this.logger.error(
        `[${correlationId}] Consent insert failed for userId=${exception.getUserId()} ${request.method} ${request.url}`,
        exception.stack
      )
    }

    sendErrorResponse(response, request, correlationId, statusCode, exception)
  }
}
