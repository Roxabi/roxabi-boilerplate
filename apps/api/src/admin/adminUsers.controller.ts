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
import { AdminUsersLifecycleService } from './adminUsers.lifecycle.js'
import { AdminUsersService } from './adminUsers.service.js'
import { AdminBadRequestFilter } from './filters/adminBadRequest.filter.js'
import { AdminConflictFilter } from './filters/adminConflict.filter.js'
import { AdminInternalErrorFilter } from './filters/adminInternalError.filter.js'
import { AdminNotFoundFilter } from './filters/adminNotFound.filter.js'

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'superadmin']).optional(),
})

export const banUserSchema = z.object({
  reason: z.string().trim().min(5).max(500),
  expires: z.string().datetime().nullable().optional(),
})

const listUsersQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return 20
    const n = Number(val)
    return Number.isNaN(n) ? 20 : Math.min(Math.max(Math.floor(n), 1), 100)
  }, z.number().int()),
  role: z.enum(['user', 'superadmin']).optional(),
  status: z.enum(['active', 'banned', 'archived']).optional(),
  organizationId: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
})

type UpdateUserDto = z.infer<typeof updateUserSchema>
type BanUserDto = z.infer<typeof banUserSchema>

@ApiTags('Admin Users')
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
@Controller('api/admin/users')
export class AdminUsersController {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly adminUsersLifecycleService: AdminUsersLifecycleService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all platform users (cross-tenant, cursor-paginated)' })
  @ApiResponse({ status: 200, description: 'Cursor-paginated list of users' })
  async listUsers(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
    @Query('search') search?: string
  ) {
    const parsed = listUsersQuerySchema.safeParse({
      cursor: cursor || undefined,
      limit,
      role: role || undefined,
      status: status || undefined,
      organizationId: organizationId || undefined,
      search: search?.trim() || undefined,
    })

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors)
    }

    const { limit: safeLimit, cursor: safeCursor, ...filters } = parsed.data
    return this.adminUsersService.listUsers(filters, safeCursor, safeLimit)
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user detail with memberships and activity' })
  @ApiResponse({ status: 200, description: 'User detail' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetail(@Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string) {
    return this.adminUsersService.getUserDetail(userId)
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update user profile (name, email, role)' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email conflict' })
  async updateUser(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Session() session: AuthenticatedSession,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserDto
  ) {
    return this.adminUsersService.updateUser(userId, body, session.user.id)
  }

  @Post(':userId/ban')
  @ApiOperation({ summary: 'Ban a user' })
  @ApiResponse({ status: 200, description: 'User banned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async banUser(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Session() session: AuthenticatedSession,
    @Body(new ZodValidationPipe(banUserSchema)) body: BanUserDto
  ) {
    const expires = body.expires ? new Date(body.expires) : null
    if (expires && Number.isNaN(expires.getTime())) {
      throw new BadRequestException('Invalid expiry date')
    }
    return this.adminUsersLifecycleService.banUser(userId, body.reason, expires, session.user.id)
  }

  @Post(':userId/unban')
  @ApiOperation({ summary: 'Unban a user' })
  @ApiResponse({ status: 200, description: 'User unbanned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unbanUser(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Session() session: AuthenticatedSession
  ) {
    return this.adminUsersLifecycleService.unbanUser(userId, session.user.id)
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Session() session: AuthenticatedSession
  ) {
    await this.adminUsersLifecycleService.deleteUser(userId, session.user.id)
  }

  @Post(':userId/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted user' })
  @ApiResponse({ status: 200, description: 'User restored' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async restoreUser(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Session() session: AuthenticatedSession
  ) {
    return this.adminUsersLifecycleService.restoreUser(userId, session.user.id)
  }
}
