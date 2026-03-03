import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  UseFilters,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Permissions } from '../auth/decorators/permissions.decorator.js'
import { Session } from '../auth/decorators/session.decorator.js'
import type { AdminSession } from '../auth/types.js'
import { AdminInvitationsService } from './adminInvitations.service.js'
import { AdminBadRequestFilter } from './filters/adminBadRequest.filter.js'
import { AdminConflictFilter } from './filters/adminConflict.filter.js'
import { AdminInternalErrorFilter } from './filters/adminInternalError.filter.js'
import { AdminNotFoundFilter } from './filters/adminNotFound.filter.js'

@ApiTags('Admin Invitations')
@ApiBearerAuth()
@UseFilters(
  AdminNotFoundFilter,
  AdminConflictFilter,
  AdminBadRequestFilter,
  AdminInternalErrorFilter
)
@Throttle({ global: { ttl: 60_000, limit: 30 } })
@Controller('api/admin/invitations')
export class AdminInvitationsController {
  constructor(private readonly adminInvitationsService: AdminInvitationsService) {}

  @Get()
  @Permissions('members:read')
  @ApiOperation({ summary: 'List pending invitations for the current organization' })
  @ApiResponse({ status: 200, description: 'List of pending invitations' })
  async listPendingInvitations(@Session() session: AdminSession) {
    return this.adminInvitationsService.listPendingInvitations(session.session.activeOrganizationId)
  }

  @Delete(':invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('members:write')
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  @ApiResponse({ status: 204, description: 'Invitation revoked' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async revokeInvitation(
    @Param('invitationId', new ParseUUIDPipe({ version: '4' })) invitationId: string,
    @Session() session: AdminSession
  ) {
    await this.adminInvitationsService.revokeInvitation(
      invitationId,
      session.session.activeOrganizationId,
      session.user.id
    )
  }
}
