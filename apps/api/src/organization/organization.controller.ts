import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'
import { Permissions } from '../auth/decorators/permissions.decorator.js'
import { Session } from '../auth/decorators/session.decorator.js'
import { ZodValidationPipe } from '../common/pipes/zodValidation.pipe.js'
import { OrganizationService } from './organization.service.js'

const deleteOrgSchema = z.object({
  confirmName: z.string().min(1),
})

type DeleteOrgDto = z.infer<typeof deleteOrgSchema>

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('api/organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // @Permissions() is intentionally omitted: this endpoint is needed before any
  // organization is active (e.g., org switcher, post-login), which makes permission
  // resolution impossible. The query is scoped to the authenticated user's own
  // memberships, so no privilege escalation is possible.
  @Get()
  @ApiOperation({ summary: 'List active organizations for the current user' })
  @ApiResponse({ status: 200, description: 'List of active organizations' })
  async listOrganizations(@Session() session: { user: { id: string } }) {
    return this.organizationService.listForUser(session.user.id)
  }

  @Delete(':id')
  @Permissions('organizations:delete')
  @ApiOperation({ summary: 'Soft-delete an organization' })
  @ApiResponse({ status: 200, description: 'Organization scheduled for deletion' })
  @ApiResponse({ status: 400, description: 'Name confirmation mismatch' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async deleteOrganization(
    @Param('id', new ParseUUIDPipe({ version: '4' })) orgId: string,
    @Session() session: { user: { id: string } },
    @Body(new ZodValidationPipe(deleteOrgSchema)) body: DeleteOrgDto
  ) {
    return this.organizationService.softDelete(orgId, session.user.id, body.confirmName)
  }

  @Post(':id/reactivate')
  @Permissions('organizations:delete')
  @ApiOperation({ summary: 'Reactivate a soft-deleted organization' })
  @ApiResponse({ status: 200, description: 'Organization reactivated' })
  @ApiResponse({ status: 400, description: 'Organization is not deleted' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions or not owner' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async reactivateOrganization(
    @Param('id', new ParseUUIDPipe({ version: '4' })) orgId: string,
    @Session() session: { user: { id: string } }
  ) {
    return this.organizationService.reactivate(orgId, session.user.id)
  }

  @Get(':id/deletion-impact')
  @Permissions('organizations:delete')
  @ApiOperation({ summary: 'Get deletion impact summary' })
  @ApiResponse({ status: 200, description: 'Impact summary' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getDeletionImpact(@Param('id', new ParseUUIDPipe({ version: '4' })) orgId: string) {
    return this.organizationService.getDeletionImpact(orgId)
  }
}
