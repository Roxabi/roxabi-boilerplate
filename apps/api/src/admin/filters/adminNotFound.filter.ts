import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { sendErrorResponse } from '../../common/filters/sendErrorResponse.js'
import { SettingNotFoundException } from '../../system-settings/index.js'
import { FlagNotFoundException } from '../exceptions/flagNotFound.exception.js'
import { InvitationNotFoundException } from '../exceptions/invitationNotFound.exception.js'
import { AdminMemberNotFoundException } from '../exceptions/memberNotFound.exception.js'
import { AdminOrgNotFoundException } from '../exceptions/orgNotFound.exception.js'
import { AdminRoleNotFoundException } from '../exceptions/roleNotFound.exception.js'
import { AdminUserNotFoundException } from '../exceptions/userNotFound.exception.js'

type AdminNotFoundException =
  | AdminMemberNotFoundException
  | AdminRoleNotFoundException
  | InvitationNotFoundException
  | AdminUserNotFoundException
  | AdminOrgNotFoundException
  | SettingNotFoundException
  | FlagNotFoundException

@Catch(
  AdminMemberNotFoundException,
  AdminRoleNotFoundException,
  InvitationNotFoundException,
  AdminUserNotFoundException,
  AdminOrgNotFoundException,
  SettingNotFoundException,
  FlagNotFoundException
)
export class AdminNotFoundFilter implements ExceptionFilter {
  constructor(private readonly cls: ClsService) {}

  catch(exception: AdminNotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()
    const correlationId = this.cls.getId()

    sendErrorResponse(response, request, correlationId, HttpStatus.NOT_FOUND, exception)
  }
}
