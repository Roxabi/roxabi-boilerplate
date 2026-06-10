import { Controller, Get, UseFilters } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../auth/decorators/permissions.decorator.js'
import { RequireApiKey } from '../../auth/decorators/requireApiKey.decorator.js'
import { Session } from '../../auth/decorators/session.decorator.js'
import type { AuthenticatedSession } from '../../auth/types.js'
import { UserService } from '../../user/user.service.js'
import type { V1UserMeResponse } from '../dto/v1Responses.js'
import { V1ExceptionFilter } from '../filters/v1Exception.filter.js'

@ApiTags('V1 Users')
@ApiSecurity('api-key')
@RequireApiKey()
@UseFilters(V1ExceptionFilter)
@Controller('api/v1/users')
export class V1UsersController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get the current API key owner profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getMe(@Session() session: AuthenticatedSession): Promise<V1UserMeResponse> {
    const profile = await this.userService.getProfile(session.user.id)
    return {
      id: profile.id,
      name: profile.fullName ?? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim(),
      email: profile.email ?? null,
      image: profile.image ?? null,
    }
  }
}
