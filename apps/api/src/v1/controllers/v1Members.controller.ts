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
  Query,
  UseFilters,
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'
import { AdminMembersService } from '../../admin/adminMembers.service.js'
import { Permissions } from '../../auth/decorators/permissions.decorator.js'
import { RequireApiKey } from '../../auth/decorators/requireApiKey.decorator.js'
import { Session } from '../../auth/decorators/session.decorator.js'
import type { AdminSession } from '../../auth/types.js'
import { ZodValidationPipe } from '../../common/pipes/zodValidation.pipe.js'
import type { V1MemberResponse, V1PaginatedResponse } from '../dto/v1Responses.js'
import { V1ExceptionFilter } from '../filters/v1Exception.filter.js'

const MAX_PAGE_LIMIT = 100

const changeRoleSchema = z.object({
  roleId: z.string().uuid(),
})

type ChangeRoleDto = z.infer<typeof changeRoleSchema>

@ApiTags('V1 Members')
@ApiSecurity('api-key')
@RequireApiKey()
@UseFilters(V1ExceptionFilter)
@Controller('api/v1/members')
export class V1MembersController {
  constructor(private readonly adminMembersService: AdminMembersService) {}

  @Get()
  @Permissions('members:read')
  @ApiOperation({ summary: 'List members of the active organization' })
  @ApiResponse({ status: 200, description: 'Paginated list of members' })
  async listMembers(
    @Session() session: AdminSession,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string
  ): Promise<V1PaginatedResponse<V1MemberResponse>> {
    const clampedPage = Math.max(1, page)
    const clampedLimit = Math.min(Math.max(1, limit), MAX_PAGE_LIMIT)
    const safeSearch = search?.trim() || undefined
    const orgId = session.session.activeOrganizationId

    const result = await this.adminMembersService.listMembers(orgId, {
      page: clampedPage,
      limit: clampedLimit,
      search: safeSearch,
    })

    return {
      // Coupled to AdminMembersService.listMembers return shape — if service renames
      // member.user.name, this mapping breaks. Consider a typed return interface.
      data: result.data.map((member) => ({
        id: member.id,
        userId: member.userId,
        name: member.user.name ?? '',
        email: member.user.email,
        role: member.role,
        joinedAt: member.createdAt.toISOString(),
      })),
      total: result.pagination.total,
      page: result.pagination.page,
      pageSize: result.pagination.limit,
    }
  }

  @Delete(':memberId')
  @Permissions('members:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from the active organization' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  async removeMember(
    @Param('memberId', new ParseUUIDPipe({ version: '4' })) memberId: string,
    @Session() session: AdminSession
  ): Promise<void> {
    const orgId = session.session.activeOrganizationId
    await this.adminMembersService.removeMember(memberId, orgId, session.user.id)
  }

  @Patch(':memberId/role')
  @Permissions('members:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Change a member's role in the active organization" })
  @ApiResponse({ status: 204, description: 'Role updated' })
  async changeMemberRole(
    @Param('memberId', new ParseUUIDPipe({ version: '4' })) memberId: string,
    @Body(new ZodValidationPipe(changeRoleSchema)) body: ChangeRoleDto,
    @Session() session: AdminSession
  ): Promise<void> {
    const orgId = session.session.activeOrganizationId
    await this.adminMembersService.changeMemberRole(
      memberId,
      orgId,
      { roleId: body.roleId },
      session.user.id
    )
  }
}
