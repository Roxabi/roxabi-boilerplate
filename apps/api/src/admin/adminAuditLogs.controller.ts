import { BadRequestException, Controller, Get, Query, UseFilters } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'
import { Roles } from '../auth/decorators/roles.decorator.js'
import { SkipOrg } from '../common/decorators/skipOrg.decorator.js'
import { AdminAuditLogsService } from './adminAuditLogs.service.js'
import { AdminBadRequestFilter } from './filters/adminBadRequest.filter.js'
import { AdminConflictFilter } from './filters/adminConflict.filter.js'
import { AdminInternalErrorFilter } from './filters/adminInternalError.filter.js'
import { AdminNotFoundFilter } from './filters/adminNotFound.filter.js'

const listAuditLogsQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  actorId: z.string().uuid().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
})

@ApiTags('Admin Audit Logs')
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
@Controller('api/admin/audit-logs')
export class AdminAuditLogsController {
  constructor(private readonly adminAuditLogsService: AdminAuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'List audit log entries (cross-tenant, cursor-paginated)' })
  @ApiResponse({ status: 200, description: 'Cursor-paginated audit log entries' })
  async listAuditLogs(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('organizationId') organizationId?: string,
    @Query('search') search?: string
  ) {
    const parsed = listAuditLogsQuerySchema.safeParse({
      cursor,
      limit,
      from: from || undefined,
      to: to || undefined,
      actorId: actorId || undefined,
      action: action || undefined,
      resource: resource || undefined,
      organizationId: organizationId || undefined,
      search: search?.trim() || undefined,
    })

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors)
    }

    const { limit: safeLimit, cursor: safeCursor, ...filters } = parsed.data
    return this.adminAuditLogsService.listAuditLogs(filters, safeCursor, safeLimit)
  }
}
