import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { sendErrorResponse } from '../../common/filters/sendErrorResponse.js'
import { OrgNotFoundException } from '../exceptions/orgNotFound.exception.js'

@Catch(OrgNotFoundException)
export class OrgNotFoundFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  catch(exception: OrgNotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    sendErrorResponse(response, request, correlationId, HttpStatus.NOT_FOUND, exception)
  }
}
