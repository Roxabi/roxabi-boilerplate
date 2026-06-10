import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { sendErrorResponse } from '../../common/filters/sendErrorResponse.js'
import { DefaultRoleException } from '../exceptions/defaultRole.exception.js'
import { MemberNotFoundException } from '../exceptions/memberNotFound.exception.js'
import { OwnershipConstraintException } from '../exceptions/ownershipConstraint.exception.js'
import { RoleInsertFailedException } from '../exceptions/roleInsertFailed.exception.js'
import { RoleNotFoundException } from '../exceptions/roleNotFound.exception.js'
import { RoleSlugConflictException } from '../exceptions/roleSlugConflict.exception.js'

type RbacException =
  | RoleNotFoundException
  | OwnershipConstraintException
  | DefaultRoleException
  | RoleSlugConflictException
  | MemberNotFoundException
  | RoleInsertFailedException

@Catch(
  RoleNotFoundException,
  OwnershipConstraintException,
  DefaultRoleException,
  RoleSlugConflictException,
  MemberNotFoundException,
  RoleInsertFailedException
)
export class RbacExceptionFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  catch(exception: RbacException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    let statusCode: number
    if (
      exception instanceof RoleNotFoundException ||
      exception instanceof MemberNotFoundException
    ) {
      statusCode = HttpStatus.NOT_FOUND
    } else if (exception instanceof RoleSlugConflictException) {
      statusCode = HttpStatus.CONFLICT
    } else if (exception instanceof RoleInsertFailedException) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    } else {
      statusCode = HttpStatus.BAD_REQUEST
    }

    sendErrorResponse(response, request, correlationId, statusCode, exception)
  }
}
