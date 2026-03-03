import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { sendErrorResponse } from '../../common/filters/sendErrorResponse.js'
import { EmailConflictException } from '../exceptions/emailConflict.exception.js'
import { FlagKeyConflictException } from '../exceptions/flagKeyConflict.exception.js'
import { InvitationAlreadyPendingException } from '../exceptions/invitationAlreadyPending.exception.js'
import { MemberAlreadyExistsException } from '../exceptions/memberAlreadyExists.exception.js'
import { OrgSlugConflictException } from '../exceptions/orgSlugConflict.exception.js'

type AdminConflictException =
  | MemberAlreadyExistsException
  | InvitationAlreadyPendingException
  | EmailConflictException
  | OrgSlugConflictException
  | FlagKeyConflictException

@Catch(
  MemberAlreadyExistsException,
  InvitationAlreadyPendingException,
  EmailConflictException,
  OrgSlugConflictException,
  FlagKeyConflictException
)
export class AdminConflictFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  catch(exception: AdminConflictException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    sendErrorResponse(response, request, correlationId, HttpStatus.CONFLICT, exception)
  }
}
