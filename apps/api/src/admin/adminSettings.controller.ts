import { Body, Controller, Get, Patch, UseFilters } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { SettingsUpdatePayload } from '@repo/types'
import { z } from 'zod'
import { AuditService } from '../audit/audit.service.js'
import { Roles } from '../auth/decorators/roles.decorator.js'
import { Session } from '../auth/decorators/session.decorator.js'
import type { AuthenticatedSession } from '../auth/types.js'
import { SkipOrg } from '../common/decorators/skipOrg.decorator.js'
import { ZodValidationPipe } from '../common/pipes/zodValidation.pipe.js'
import { SystemSettingsService } from '../system-settings/systemSettings.service.js'
import { AdminBadRequestFilter } from './filters/adminBadRequest.filter.js'
import { AdminConflictFilter } from './filters/adminConflict.filter.js'
import { AdminInternalErrorFilter } from './filters/adminInternalError.filter.js'
import { AdminNotFoundFilter } from './filters/adminNotFound.filter.js'

export const settingsUpdateSchema = z.object({
  updates: z
    .array(
      z
        .object({
          key: z.string().min(1),
          value: z.unknown(),
        })
        .refine((obj) => 'value' in obj, {
          message: 'Value is required',
          path: ['value'],
        })
    )
    .min(1),
})

@ApiTags('Admin Settings')
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
@Controller('api/admin/settings')
export class AdminSettingsController {
  constructor(
    private readonly systemSettingsService: SystemSettingsService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all system settings grouped by category' })
  @ApiResponse({ status: 200, description: 'Settings grouped by category' })
  async getSettings() {
    const all = await this.systemSettingsService.getAll()
    const grouped: Record<string, typeof all> = {}
    for (const s of all) {
      if (!grouped[s.category]) {
        grouped[s.category] = []
      }
      grouped[s.category]?.push(s)
    }
    return grouped
  }

  @Patch()
  @ApiOperation({ summary: 'Batch update system settings' })
  @ApiResponse({ status: 200, description: 'Updated settings' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async updateSettings(
    @Session() session: AuthenticatedSession,
    @Body(new ZodValidationPipe(settingsUpdateSchema)) body: SettingsUpdatePayload
  ) {
    const { updated, beforeState } = await this.systemSettingsService.batchUpdate(body.updates)

    for (const u of updated) {
      this.auditService.log({
        actorId: session.user.id,
        actorType: 'user',
        action: 'settings.updated',
        resource: 'system_setting',
        resourceId: u.key as string,
        before: { value: (beforeState as Record<string, unknown>)[u.key as string] },
        after: { value: u.value },
      })
    }

    return updated
  }
}
