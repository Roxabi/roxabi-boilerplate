import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { sendErrorResponse } from '../../common/filters/sendErrorResponse.js'
import { TransferTargetNotMemberException } from '../exceptions/transferTargetNotMember.exception.js'

@Catch(TransferTargetNotMemberException)
export class TransferTargetNotMemberFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  catch(exception: TransferTargetNotMemberException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    sendErrorResponse(response, request, correlationId, HttpStatus.BAD_REQUEST, exception)
  }
}
