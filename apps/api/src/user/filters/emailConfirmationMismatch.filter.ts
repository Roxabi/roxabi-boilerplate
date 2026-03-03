import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { sendErrorResponse } from '../../common/filters/sendErrorResponse.js'
import { EmailConfirmationMismatchException } from '../exceptions/emailConfirmationMismatch.exception.js'

@Catch(EmailConfirmationMismatchException)
export class EmailConfirmationMismatchFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  catch(exception: EmailConfirmationMismatchException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    sendErrorResponse(response, request, correlationId, HttpStatus.BAD_REQUEST, exception)
  }
}
