import { Body, Controller, Delete, Get, Patch, Post, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { FastifyReply } from 'fastify'
import { z } from 'zod'
import { Session } from '../auth/decorators/session.decorator.js'
import { ZodValidationPipe } from '../common/pipes/zodValidation.pipe.js'
import { UserService } from './user.service.js'

const avatarOptionValue = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional(),
  fullName: z.string().min(1).max(200).optional(),
  avatarSeed: z.string().max(200).nullable().optional(),
  avatarStyle: z.string().max(50).nullable().optional(),
  avatarOptions: z
    .record(z.string(), avatarOptionValue)
    .refine((val) => JSON.stringify(val).length <= 4096, 'avatarOptions too large')
    .optional(),
  image: z.string().url().max(2000).nullable().optional(),
})

type UpdateProfileDto = z.infer<typeof updateProfileSchema>

const orgResolutionSchema = z.discriminatedUnion('action', [
  z.object({
    organizationId: z.string().uuid(),
    action: z.literal('transfer'),
    transferToUserId: z.string().uuid(),
  }),
  z.object({
    organizationId: z.string().uuid(),
    action: z.literal('delete'),
  }),
])

const deleteAccountSchema = z.object({
  confirmEmail: z.string().email(),
  orgResolutions: z.array(orgResolutionSchema).default([]),
})

type DeleteAccountDto = z.infer<typeof deleteAccountSchema>

const purgeAccountSchema = z.object({
  confirmEmail: z.string().email(),
})

type PurgeAccountDto = z.infer<typeof purgeAccountSchema>

@ApiTags('Users')
@ApiBearerAuth()
@Controller('api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getMe(@Session() session: { user: { id: string } }) {
    return this.userService.getProfile(session.user.id)
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Updated user profile' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async updateMe(
    @Session() session: { user: { id: string } },
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileDto
  ) {
    return this.userService.updateProfile(session.user.id, body)
  }

  @Delete('me')
  @ApiOperation({ summary: 'Initiate account soft-deletion' })
  @ApiResponse({ status: 200, description: 'Account scheduled for deletion' })
  @ApiResponse({ status: 400, description: 'Email confirmation mismatch' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async deleteMe(
    @Session() session: { user: { id: string } },
    @Body(new ZodValidationPipe(deleteAccountSchema)) body: DeleteAccountDto
  ) {
    return this.userService.softDelete(session.user.id, body.confirmEmail, body.orgResolutions)
  }

  @Post('me/reactivate')
  @ApiOperation({ summary: 'Reactivate a soft-deleted account' })
  @ApiResponse({ status: 200, description: 'Account reactivated' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async reactivateMe(@Session() session: { user: { id: string } }) {
    return this.userService.reactivate(session.user.id)
  }

  @Get('me/owned-organizations')
  @ApiOperation({ summary: 'Get organizations owned by the current user' })
  @ApiResponse({ status: 200, description: 'Owned organizations' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getOwnedOrganizations(@Session() session: { user: { id: string } }) {
    return this.userService.getOwnedOrganizations(session.user.id)
  }

  @Post('me/purge')
  @ApiOperation({ summary: 'Permanently delete (purge) a soft-deleted account' })
  @ApiResponse({ status: 200, description: 'Account permanently deleted' })
  @ApiResponse({
    status: 400,
    description: 'Email confirmation mismatch or account not scheduled for deletion',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async purgeMe(
    @Session() session: { user: { id: string } },
    @Body(new ZodValidationPipe(purgeAccountSchema)) body: PurgeAccountDto,
    @Res({ passthrough: true }) response: FastifyReply
  ) {
    const result = await this.userService.purge(session.user.id, body.confirmEmail)

    // Clear the session cookie to ensure the browser discards any cached session
    response.clearCookie('better-auth.session_token', { path: '/' })

    return result
  }
}
