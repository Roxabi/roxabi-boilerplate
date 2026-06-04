import { Body, Controller, Get, Logger, Patch, UseFilters } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { SettingsUpdatePayload } from '@repo/types'
import { z } from 'zod'
import type { AuditService } from '../audit/audit.service.js'
import { Roles } from '../auth/decorators/roles.decorator.js'
import { Session } from '../auth/decorators/session.decorator.js'
import type { AuthenticatedSession } from '../auth/types.js'
import { SkipOrg } from '../common/decorators/skipOrg.decorator.js'
import { ZodValidationPipe } from '../common/pipes/zodValidation.pipe.js'
import type { SystemSettingsService } from '../system-settings/systemSettings.service.js'
import { AdminBadRequestFilter } from './filters/adminBadRequest.filter.js'
import { AdminConflictFilter } from './filters/adminConflict.filter.js'
import { AdminInternalErrorFilter } from './filters/adminInternalError.filter.js'
import { AdminNotFoundFilter } from './filters/adminNotFound.filter.js'

const settingValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

const SETTING_VALUE_SCHEMAS: Record<string, z.ZodType> = {
  'app.name': z.string().min(1).max(64),
  'app.supportEmail': z.string().email(),
  'app.maintenanceMode': z.boolean(),
  'auth.signupEnabled': z.boolean(),
  'auth.sessionTtlHours': z.number().int().min(1),
  'auth.maxLoginAttempts': z.number().int().min(1),
  'org.maxMembers': z.number().int().min(1),
  'org.allowSelfRegistration': z.boolean(),
  'email.fromName': z.string().min(1).max(128),
  'email.fromAddress': z.string().email(),
  'email.footerText': z.string(),
  'security.passwordMinLength': z.number().int().min(1),
}

export const settingsUpdateSchema = z.object({
  updates: z
    .array(
      z
        .object({
          key: z.string().min(1),
          value: settingValueSchema,
        })
        .refine((obj) => 'value' in obj, {
          message: 'Value is required',
          path: ['value'],
        })
    )
    .min(1)
    .refine(
      (items) => {
        for (const item of items) {
          const schema = SETTING_VALUE_SCHEMAS[item.key]
          if (schema) {
            const result = schema.safeParse(item.value)
            if (!result.success) return false
          }
        }
        return true
      },
      {
        message: 'One or more setting values are invalid for their key',
      }
    ),
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
  private readonly logger = new Logger(AdminSettingsController.name)

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
      this.auditService
        .log({
          actorId: session.user.id,
          actorType: 'user',
          action: 'settings.updated',
          resource: 'system_setting',
          resourceId: u.key,
          before: { value: beforeState[u.key] },
          after: { value: u.value },
        })
        .catch((err) => {
          this.logger.error(
            '[audit] Failed to log system_settings.updated',
            err instanceof Error ? err.stack : String(err)
          )
        })
    }

    return updated
  }
}
