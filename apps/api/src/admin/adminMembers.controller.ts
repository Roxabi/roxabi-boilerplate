import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'
import { Permissions } from '../auth/decorators/permissions.decorator.js'
import { Session } from '../auth/decorators/session.decorator.js'
import type { AdminSession } from '../auth/types.js'
import { ZodValidationPipe } from '../common/pipes/zodValidation.pipe.js'
import { AdminInvitationsService } from './adminInvitations.service.js'
import { AdminMembersService } from './adminMembers.service.js'
import { AdminBadRequestFilter } from './filters/adminBadRequest.filter.js'
import { AdminConflictFilter } from './filters/adminConflict.filter.js'
import { AdminInternalErrorFilter } from './filters/adminInternalError.filter.js'
import { AdminNotFoundFilter } from './filters/adminNotFound.filter.js'

const inviteMemberSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid(),
})

const changeMemberRoleSchema = z.object({
  roleId: z.string().uuid(),
})

type InviteMemberDto = z.infer<typeof inviteMemberSchema>
type ChangeMemberRoleDto = z.infer<typeof changeMemberRoleSchema>

const MAX_PAGE_LIMIT = 100

@ApiTags('Admin Members')
@ApiBearerAuth()
@UseFilters(
  AdminNotFoundFilter,
  AdminConflictFilter,
  AdminBadRequestFilter,
  AdminInternalErrorFilter
)
@Throttle({ global: { ttl: 60_000, limit: 30 } })
@Controller('api/admin/members')
export class AdminMembersController {
  constructor(
    private readonly adminMembersService: AdminMembersService,
    private readonly adminInvitationsService: AdminInvitationsService
  ) {}

  @Get()
  @Permissions('members:read')
  @ApiOperation({ summary: 'List members for the current organization' })
  @ApiResponse({ status: 200, description: 'Paginated list of members' })
  async listMembers(
    @Session()
    session: { session: { activeOrganizationId: string } },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), MAX_PAGE_LIMIT)
    const safePage = Math.max(page, 1)
    const safeSearch = search?.trim() || undefined
    return this.adminMembersService.listMembers(session.session.activeOrganizationId, {
      page: safePage,
      limit: safeLimit,
      search: safeSearch,
    })
  }

  @Post('invite')
  @Permissions('members:write')
  @ApiOperation({ summary: 'Invite a new member to the organization' })
  @ApiResponse({ status: 201, description: 'Invitation created' })
  @ApiResponse({ status: 400, description: 'Member already exists or invitation pending' })
  async inviteMember(
    @Session() session: AdminSession,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: InviteMemberDto
  ) {
    return this.adminInvitationsService.inviteMember(
      session.session.activeOrganizationId,
      body,
      session.user.id
    )
  }

  @Patch(':memberId')
  @Permissions('members:write')
  @ApiOperation({ summary: "Change a member's role" })
  @ApiResponse({ status: 200, description: 'Member role updated' })
  @ApiResponse({ status: 404, description: 'Member or role not found' })
  async changeMemberRole(
    @Param('memberId', new ParseUUIDPipe({ version: '4' })) memberId: string,
    @Session() session: AdminSession,
    @Body(new ZodValidationPipe(changeMemberRoleSchema)) body: ChangeMemberRoleDto
  ) {
    return this.adminMembersService.changeMemberRole(
      memberId,
      session.session.activeOrganizationId,
      body,
      session.user.id
    )
  }

  @Delete(':memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('members:delete')
  @ApiOperation({ summary: 'Remove a member from the organization' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  @ApiResponse({ status: 400, description: 'Cannot remove the last owner' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async removeMember(
    @Param('memberId', new ParseUUIDPipe({ version: '4' })) memberId: string,
    @Session() session: AdminSession
  ) {
    await this.adminMembersService.removeMember(
      memberId,
      session.session.activeOrganizationId,
      session.user.id
    )
  }
}
