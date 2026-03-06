import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'
import { Permissions } from '../auth/decorators/permissions.decorator.js'
import { Session } from '../auth/decorators/session.decorator.js'
import { ZodValidationPipe } from '../common/pipes/zodValidation.pipe.js'
import { PermissionService } from './permission.service.js'
import { RbacService } from './rbac.service.js'
import { RbacMemberService } from './rbacMember.service.js'

/** Matches "resource:action" where both segments are lowercase letters with optional hyphens (e.g. "audit-log:read"). */
export const PERMISSION_FORMAT = /^[a-z][a-z-]*:[a-z][a-z-]*$/

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string().regex(PERMISSION_FORMAT)).min(1),
})

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string().regex(PERMISSION_FORMAT)).optional(),
})

const transferOwnershipSchema = z.object({
  targetMemberId: z.string().uuid(),
})

const changeMemberRoleSchema = z.object({
  roleId: z.string().uuid(),
})

type CreateRoleDto = z.infer<typeof createRoleSchema>
type UpdateRoleDto = z.infer<typeof updateRoleSchema>
type TransferOwnershipDto = z.infer<typeof transferOwnershipSchema>
type ChangeMemberRoleDto = z.infer<typeof changeMemberRoleSchema>

@ApiTags('RBAC')
@ApiBearerAuth()
@Controller('api/roles')
export class RbacController {
  constructor(
    private readonly rbacService: RbacService,
    private readonly rbacMemberService: RbacMemberService,
    private readonly permissionService: PermissionService
  ) {}

  @Get()
  @Permissions('roles:read')
  @ApiOperation({ summary: 'List roles for the current organization' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async listRoles() {
    return this.rbacService.listRoles()
  }

  @Get('permissions')
  @Permissions('roles:read')
  @ApiOperation({ summary: 'List all available permissions' })
  @ApiResponse({ status: 200, description: 'List of all permissions' })
  async listPermissions() {
    return this.permissionService.getAllPermissions()
  }

  @Post('transfer-ownership')
  @Permissions('members:write')
  @ApiOperation({ summary: 'Transfer organization ownership to another Admin' })
  @ApiResponse({ status: 200, description: 'Ownership transferred' })
  @ApiResponse({ status: 400, description: 'Ownership constraint violated' })
  async transferOwnership(
    @Session() session: { user: { id: string } },
    @Body(new ZodValidationPipe(transferOwnershipSchema)) body: TransferOwnershipDto
  ) {
    return this.rbacMemberService.transferOwnership(session.user.id, body.targetMemberId)
  }

  @Post()
  @Permissions('roles:write')
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({ status: 409, description: 'Role slug already exists' })
  async createRole(@Body(new ZodValidationPipe(createRoleSchema)) body: CreateRoleDto) {
    return this.rbacService.createRole(body)
  }

  @Get(':id/permissions')
  @Permissions('roles:read')
  @ApiOperation({ summary: 'Get permissions for a specific role' })
  @ApiResponse({ status: 200, description: 'List of permissions' })
  async getRolePermissions(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.rbacService.getRolePermissions(id)
  }

  @Patch(':id')
  @Permissions('roles:write')
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async updateRole(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(updateRoleSchema)) body: UpdateRoleDto
  ) {
    return this.rbacService.updateRole(id, body)
  }

  @Delete(':id')
  @Permissions('roles:delete')
  @ApiOperation({ summary: 'Delete a custom role (members fallback to Viewer)' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async deleteRole(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.rbacService.deleteRole(id)
  }

  @Patch('members/:id/role')
  @Permissions('members:write')
  @ApiOperation({
    summary: "Change a member's role",
    deprecated: true,
    description:
      'Deprecated: use PATCH /api/admin/members/:memberId instead. This endpoint will be removed in a future version.',
  })
  @ApiResponse({ status: 200, description: 'Member role updated' })
  async changeMemberRole(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(changeMemberRoleSchema)) body: ChangeMemberRoleDto
  ) {
    return this.rbacMemberService.changeMemberRole(id, body.roleId)
  }
}
