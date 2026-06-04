import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ClsService } from 'nestjs-cls'
import { sendErrorResponse } from '../../common/filters/sendErrorResponse.js'
import { SuperadminProtectionException } from '../exceptions/superadminProtection.exception.js'

@Catch(SuperadminProtectionException)
export class AdminForbiddenFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  catch(exception: SuperadminProtectionException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    sendErrorResponse(response, request, correlationId, HttpStatus.FORBIDDEN, exception)
  }
}
