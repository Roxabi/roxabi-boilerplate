import { Controller, Get, UseFilters } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../auth/decorators/permissions.decorator.js'
import { RequireApiKey } from '../../auth/decorators/requireApiKey.decorator.js'
import { Session } from '../../auth/decorators/session.decorator.js'
import type { AuthenticatedSession } from '../../auth/types.js'
import { RbacService } from '../../rbac/rbac.service.js'
import type { V1RoleResponse } from '../dto/v1Responses.js'
import { V1ExceptionFilter } from '../filters/v1Exception.filter.js'

@ApiTags('V1 Roles')
@ApiSecurity('api-key')
@RequireApiKey()
@UseFilters(V1ExceptionFilter)
@Controller('api/v1/roles')
export class V1RolesController {
  constructor(private readonly rbacService: RbacService) {}

  @Get()
  @Permissions('roles:read')
  @ApiOperation({ summary: 'List roles for the current organization' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async listRoles(@Session() _session: AuthenticatedSession): Promise<V1RoleResponse[]> {
    const roles = await this.rbacService.listRolesWithPermissions()
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((p) => `${p.resource}:${p.action}`),
    }))
  }
}
