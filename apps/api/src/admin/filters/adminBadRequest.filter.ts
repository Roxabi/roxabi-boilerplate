import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { sendErrorResponse } from '../../common/filters/sendErrorResponse.js'
import { SettingValidationException } from '../../system-settings/index.js'
import { FlagKeyInvalidException } from '../exceptions/flagKeyInvalid.exception.js'
import { LastOwnerConstraintException } from '../exceptions/lastOwnerConstraint.exception.js'
import { LastSuperadminException } from '../exceptions/lastSuperadmin.exception.js'
import { OrgCycleDetectedException } from '../exceptions/orgCycleDetected.exception.js'
import { OrgDepthExceededException } from '../exceptions/orgDepthExceeded.exception.js'
import { SelfActionException } from '../exceptions/selfAction.exception.js'
import { SelfRemovalException } from '../exceptions/selfRemoval.exception.js'
import { SelfRoleChangeException } from '../exceptions/selfRoleChange.exception.js'
import { UserAlreadyBannedException } from '../exceptions/userAlreadyBanned.exception.js'

type AdminBadRequestException =
  | LastOwnerConstraintException
  | LastSuperadminException
  | SelfRemovalException
  | SelfRoleChangeException
  | SelfActionException
  | UserAlreadyBannedException
  | OrgDepthExceededException
  | OrgCycleDetectedException
  | SettingValidationException
  | FlagKeyInvalidException

@Catch(
  LastOwnerConstraintException,
  LastSuperadminException,
  SelfRemovalException,
  SelfRoleChangeException,
  SelfActionException,
  UserAlreadyBannedException,
  OrgDepthExceededException,
  OrgCycleDetectedException,
  SettingValidationException,
  FlagKeyInvalidException
)
export class AdminBadRequestFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  catch(exception: AdminBadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    sendErrorResponse(response, request, correlationId, HttpStatus.BAD_REQUEST, exception)
  }
}
