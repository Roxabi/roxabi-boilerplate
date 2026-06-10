import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { sendErrorResponse } from '../../common/filters/sendErrorResponse.js'
import { TenantContextMissingException } from '../exceptions/tenantContextMissing.exception.js'

@Catch(TenantContextMissingException)
export class TenantContextMissingFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  catch(exception: TenantContextMissingException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    sendErrorResponse(response, request, correlationId, HttpStatus.FORBIDDEN, exception)
  }
}
