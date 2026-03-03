import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { sendErrorResponse } from '../../common/filters/sendErrorResponse.js'
import { OrgNameConfirmationMismatchException } from '../exceptions/orgNameConfirmationMismatch.exception.js'
import { OrgNotDeletedException } from '../exceptions/orgNotDeleted.exception.js'
import { OrgNotOwnerException } from '../exceptions/orgNotOwner.exception.js'

@Catch(OrgNotOwnerException)
export class OrgNotOwnerFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  catch(exception: OrgNotOwnerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    sendErrorResponse(response, request, correlationId, HttpStatus.FORBIDDEN, exception)
  }
}

@Catch(OrgNameConfirmationMismatchException)
export class OrgNameConfirmationMismatchFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  catch(exception: OrgNameConfirmationMismatchException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    sendErrorResponse(response, request, correlationId, HttpStatus.BAD_REQUEST, exception)
  }
}

@Catch(OrgNotDeletedException)
export class OrgNotDeletedFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  catch(exception: OrgNotDeletedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    sendErrorResponse(response, request, correlationId, HttpStatus.BAD_REQUEST, exception)
  }
}
