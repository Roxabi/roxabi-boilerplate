import { Controller, Get, UseFilters } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../auth/decorators/permissions.decorator.js'
import { RequireApiKey } from '../../auth/decorators/requireApiKey.decorator.js'
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
  async listRoles(): Promise<V1RoleResponse[]> {
    const roles = await this.rbacService.listRoles()
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissions = await this.rbacService.getRolePermissions(role.id)
        return {
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: permissions.map((p) => `${p.resource}:${p.action}`),
        }
      })
    )
    return rolesWithPermissions
  }
}
