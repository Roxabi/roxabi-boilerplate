import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'
import { Roles } from '../auth/decorators/roles.decorator.js'
import { Session } from '../auth/decorators/session.decorator.js'
import type { AuthenticatedSession } from '../auth/types.js'
import { SkipOrg } from '../common/decorators/skipOrg.decorator.js'
import { ZodValidationPipe } from '../common/pipes/zodValidation.pipe.js'
import { AdminMembersService } from './adminMembers.service.js'
import { AdminOrganizationsDeletionService } from './adminOrganizations.deletion.js'
import { AdminOrganizationsService } from './adminOrganizations.service.js'
import { AdminBadRequestFilter } from './filters/adminBadRequest.filter.js'
import { AdminConflictFilter } from './filters/adminConflict.filter.js'
import { AdminInternalErrorFilter } from './filters/adminInternalError.filter.js'
import { AdminNotFoundFilter } from './filters/adminNotFound.filter.js'

const changeMemberRoleSchema = z.object({
  roleId: z.string().uuid(),
})

type ChangeMemberRoleDto = z.infer<typeof changeMemberRoleSchema>

const createOrgSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  parentOrganizationId: z.string().uuid().nullable().optional(),
})

const updateOrgSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  parentOrganizationId: z.string().uuid().nullable().optional(),
})

type CreateOrgDto = z.infer<typeof createOrgSchema>
type UpdateOrgDto = z.infer<typeof updateOrgSchema>

const listOrgsQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return 20
    const n = Number(val)
    return Number.isNaN(n) ? 20 : Math.min(Math.max(Math.floor(n), 1), 100)
  }, z.number().int()),
  status: z.enum(['active', 'archived']).optional(),
  search: z.string().max(200).optional(),
  view: z.enum(['list', 'tree']).optional(),
})

@ApiTags('Admin Organizations')
@ApiBearerAuth()
@UseFilters(
  AdminNotFoundFilter,
  AdminConflictFilter,
  AdminBadRequestFilter,
  AdminInternalErrorFilter
)
@Throttle({ global: { ttl: 60_000, limit: 30 } })
@Roles('superadmin')
@SkipOrg()
@Controller('api/admin/organizations')
export class AdminOrganizationsController {
  constructor(
    private readonly adminOrganizationsService: AdminOrganizationsService,
    private readonly adminMembersService: AdminMembersService,
    private readonly adminOrganizationsDeletionService: AdminOrganizationsDeletionService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all organizations (flat or tree view)' })
  @ApiResponse({ status: 200, description: 'Organization list' })
  async listOrganizations(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('view') view?: string
  ) {
    const parsed = listOrgsQuerySchema.safeParse({
      cursor: cursor || undefined,
      limit,
      status: status || undefined,
      search: search?.trim() || undefined,
      view: view || undefined,
    })

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors)
    }

    if (parsed.data.view === 'tree') {
      return this.adminOrganizationsService.listOrganizationsForTree()
    }

    const { limit: safeLimit, cursor: safeCursor, view: _view, ...filters } = parsed.data
    return this.adminOrganizationsService.listOrganizations(filters, safeCursor, safeLimit)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({ status: 201, description: 'Organization created' })
  @ApiResponse({ status: 400, description: 'Depth exceeded' })
  @ApiResponse({ status: 409, description: 'Slug conflict' })
  async createOrganization(
    @Session() session: AuthenticatedSession,
    @Body(new ZodValidationPipe(createOrgSchema)) body: CreateOrgDto
  ) {
    return this.adminOrganizationsService.createOrganization(body, session.user.id)
  }

  @Get(':orgId')
  @ApiOperation({ summary: 'Get organization detail with members and children' })
  @ApiResponse({ status: 200, description: 'Organization detail' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationDetail(@Param('orgId', new ParseUUIDPipe({ version: '4' })) orgId: string) {
    return this.adminOrganizationsService.getOrganizationDetail(orgId)
  }

  @Patch(':orgId')
  @ApiOperation({ summary: 'Update organization (name, slug, parent)' })
  @ApiResponse({ status: 200, description: 'Organization updated' })
  @ApiResponse({ status: 400, description: 'Depth exceeded or cycle detected' })
  @ApiResponse({ status: 409, description: 'Slug conflict' })
  async updateOrganization(
    @Param('orgId', new ParseUUIDPipe({ version: '4' })) orgId: string,
    @Session() session: AuthenticatedSession,
    @Body(new ZodValidationPipe(updateOrgSchema)) body: UpdateOrgDto
  ) {
    return this.adminOrganizationsService.updateOrganization(orgId, body, session.user.id)
  }

  @Get(':orgId/roles')
  @ApiOperation({ summary: 'List available RBAC roles for an organization (#313)' })
  @ApiResponse({ status: 200, description: 'Roles list' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async listOrgRoles(@Param('orgId', new ParseUUIDPipe({ version: '4' })) orgId: string) {
    return this.adminOrganizationsService.listOrgRoles(orgId)
  }

  @Patch(':orgId/members/:memberId/role')
  @ApiOperation({ summary: 'Change a member role within the organization (#313)' })
  @ApiResponse({ status: 200, description: 'Role changed' })
  @ApiResponse({ status: 400, description: 'Last owner constraint' })
  @ApiResponse({ status: 404, description: 'Member or role not found' })
  async changeMemberRole(
    @Param('orgId', new ParseUUIDPipe({ version: '4' })) orgId: string,
    @Param('memberId', new ParseUUIDPipe({ version: '4' })) memberId: string,
    @Session() session: AuthenticatedSession,
    @Body(new ZodValidationPipe(changeMemberRoleSchema)) body: ChangeMemberRoleDto
  ) {
    return this.adminMembersService.changeMemberRole(memberId, orgId, body, session.user.id)
  }

  @Get(':orgId/deletion-impact')
  @ApiOperation({ summary: 'Preview deletion impact for an organization' })
  @ApiResponse({ status: 200, description: 'Deletion impact preview' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getDeletionImpact(@Param('orgId', new ParseUUIDPipe({ version: '4' })) orgId: string) {
    return this.adminOrganizationsDeletionService.getDeletionImpact(orgId)
  }

  @Delete(':orgId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an organization' })
  @ApiResponse({ status: 204, description: 'Organization deleted' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async deleteOrganization(
    @Param('orgId', new ParseUUIDPipe({ version: '4' })) orgId: string,
    @Session() session: AuthenticatedSession
  ) {
    await this.adminOrganizationsDeletionService.deleteOrganization(orgId, session.user.id)
  }

  @Post(':orgId/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted organization' })
  @ApiResponse({ status: 200, description: 'Organization restored' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async restoreOrganization(
    @Param('orgId', new ParseUUIDPipe({ version: '4' })) orgId: string,
    @Session() session: AuthenticatedSession
  ) {
    return this.adminOrganizationsDeletionService.restoreOrganization(orgId, session.user.id)
  }
}
