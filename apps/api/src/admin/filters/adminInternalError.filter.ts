import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { sendErrorResponse } from '../../common/filters/sendErrorResponse.js'
import { FeatureFlagCreateFailedException } from '../exceptions/featureFlagCreateFailed.exception.js'

@Catch(FeatureFlagCreateFailedException)
export class AdminInternalErrorFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  catch(exception: FeatureFlagCreateFailedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    sendErrorResponse(response, request, correlationId, HttpStatus.INTERNAL_SERVER_ERROR, exception)
  }
}
