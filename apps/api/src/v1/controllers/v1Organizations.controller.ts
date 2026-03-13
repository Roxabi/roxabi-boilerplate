import { Controller, Get, UseFilters } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../auth/decorators/permissions.decorator.js'
import { RequireApiKey } from '../../auth/decorators/requireApiKey.decorator.js'
import { Session } from '../../auth/decorators/session.decorator.js'
import type { AuthenticatedSession } from '../../auth/types.js'
import { OrganizationService } from '../../organization/organization.service.js'
import type { V1OrganizationResponse } from '../dto/v1Responses.js'
import { V1ExceptionFilter } from '../filters/v1Exception.filter.js'

@ApiTags('V1 Organizations')
@ApiSecurity('api-key')
@RequireApiKey()
@UseFilters(V1ExceptionFilter)
@Controller('api/v1/organizations')
export class V1OrganizationsController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  @Permissions('organizations:read')
  @ApiOperation({ summary: 'List organizations for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of organizations' })
  async listOrganizations(
    @Session() session: AuthenticatedSession
  ): Promise<V1OrganizationResponse[]> {
    const orgs = await this.organizationService.listForUser(session.user.id)
    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug ?? '',
      logo: org.logo ?? null,
      createdAt: org.createdAt.toISOString(),
    }))
  }
}
