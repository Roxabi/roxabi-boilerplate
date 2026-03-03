import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseFilters,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'
import { AuditService } from '../audit/audit.service.js'
import { Roles } from '../auth/decorators/roles.decorator.js'
import { Session } from '../auth/decorators/session.decorator.js'
import type { AuthenticatedSession } from '../auth/types.js'
import { SkipOrg } from '../common/decorators/skipOrg.decorator.js'
import { ZodValidationPipe } from '../common/pipes/zodValidation.pipe.js'
import { PG_UNIQUE_VIOLATION } from '../database/pgErrorCodes.js'
import { FeatureFlagService } from '../feature-flags/featureFlags.service.js'
import { FeatureFlagCreateFailedException } from './exceptions/featureFlagCreateFailed.exception.js'
import { FlagKeyConflictException } from './exceptions/flagKeyConflict.exception.js'
import { FlagNotFoundException } from './exceptions/flagNotFound.exception.js'
import { AdminBadRequestFilter } from './filters/adminBadRequest.filter.js'
import { AdminConflictFilter } from './filters/adminConflict.filter.js'
import { AdminInternalErrorFilter } from './filters/adminInternalError.filter.js'
import { AdminNotFoundFilter } from './filters/adminNotFound.filter.js'

const FLAG_KEY_REGEX = /^[a-z0-9][a-z0-9_-]*$/

const createFlagSchema = z.object({
  name: z.string().min(1).max(200),
  key: z.string().min(1).max(100).regex(FLAG_KEY_REGEX),
  description: z.string().max(1000).optional(),
})

const updateFlagSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

@ApiTags('Admin Feature Flags')
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
@Controller('api/admin/feature-flags')
export class AdminFeatureFlagsController {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags' })
  @ApiResponse({ status: 200, description: 'List of feature flags' })
  async getAll() {
    return this.featureFlagService.getAll()
  }

  @Post()
  @ApiOperation({ summary: 'Create a feature flag' })
  @ApiResponse({ status: 201, description: 'Feature flag created' })
  @ApiResponse({ status: 409, description: 'Key already exists' })
  async create(
    @Session() session: AuthenticatedSession,
    @Body(new ZodValidationPipe(createFlagSchema)) body: z.infer<typeof createFlagSchema>
  ) {
    let result: NonNullable<Awaited<ReturnType<FeatureFlagService['create']>>>
    try {
      const row = await this.featureFlagService.create(body)
      if (!row) throw new FeatureFlagCreateFailedException()
      result = row
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as Record<string, unknown>).code === PG_UNIQUE_VIOLATION
      ) {
        throw new FlagKeyConflictException(body.key)
      }
      throw error
    }

    this.auditService.log({
      actorId: session.user.id,
      actorType: 'user',
      action: 'flag.created',
      resource: 'feature_flag',
      resourceId: result.id,
      after: result,
    })

    return result
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag updated' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async update(
    @Session() session: AuthenticatedSession,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(updateFlagSchema)) body: z.infer<typeof updateFlagSchema>
  ) {
    const before = await this.featureFlagService.getById(id)
    if (!before) {
      throw new FlagNotFoundException(id)
    }

    const result = await this.featureFlagService.update(id, body)
    if (!result) {
      throw new FlagNotFoundException(id)
    }

    const bodyKeys = Object.keys(body)
    const action =
      bodyKeys.length === 1 && bodyKeys[0] === 'enabled' ? 'flag.toggled' : 'flag.updated'

    this.auditService.log({
      actorId: session.user.id,
      actorType: 'user',
      action,
      resource: 'feature_flag',
      resourceId: id,
      before,
      after: result,
    })

    return result
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a feature flag' })
  @ApiResponse({ status: 204, description: 'Feature flag deleted' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async delete(
    @Session() session: AuthenticatedSession,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    const existing = await this.featureFlagService.getById(id)
    if (!existing) {
      throw new FlagNotFoundException(id)
    }

    await this.featureFlagService.delete(id)

    this.auditService.log({
      actorId: session.user.id,
      actorType: 'user',
      action: 'flag.deleted',
      resource: 'feature_flag',
      resourceId: id,
      before: existing,
    })
  }
}
