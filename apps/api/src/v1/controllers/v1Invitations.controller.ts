import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'
import { AdminInvitationsService, INVITATION_TTL_MS } from '../../admin/adminInvitations.service.js'
import { Permissions } from '../../auth/decorators/permissions.decorator.js'
import { RequireApiKey } from '../../auth/decorators/requireApiKey.decorator.js'
import { Session } from '../../auth/decorators/session.decorator.js'
import type { AdminSession } from '../../auth/types.js'
import { ZodValidationPipe } from '../../common/pipes/zodValidation.pipe.js'
import type { V1InvitationResponse } from '../dto/v1Responses.js'
import { V1ExceptionFilter } from '../filters/v1Exception.filter.js'

const createInvitationSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid(),
})

type CreateInvitationDto = z.infer<typeof createInvitationSchema>

function mapToInvitationResponse(invitation: {
  id: string
  email: string
  role: string
  status: string
  expiresAt: Date
}): V1InvitationResponse {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    invitedAt: new Date(invitation.expiresAt.getTime() - INVITATION_TTL_MS).toISOString(),
    expiresAt: invitation.expiresAt.toISOString(),
  }
}

@ApiTags('V1 Invitations')
@ApiSecurity('api-key')
@RequireApiKey()
@UseFilters(V1ExceptionFilter)
@Controller('api/v1/invitations')
export class V1InvitationsController {
  constructor(private readonly adminInvitationsService: AdminInvitationsService) {}

  @Get()
  @Permissions('members:read')
  @ApiOperation({ summary: 'List pending invitations for the current organization' })
  @ApiResponse({ status: 200, description: 'List of pending invitations' })
  async listPendingInvitations(@Session() session: AdminSession): Promise<V1InvitationResponse[]> {
    const result = await this.adminInvitationsService.listPendingInvitations(
      session.session.activeOrganizationId
    )
    return result.data.map(mapToInvitationResponse)
  }

  @Post()
  @Permissions('members:write')
  @ApiOperation({ summary: 'Invite a new member to the organization' })
  @ApiResponse({ status: 201, description: 'Invitation created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Invitation already pending or member already exists' })
  async inviteMember(
    @Body(new ZodValidationPipe(createInvitationSchema)) body: CreateInvitationDto,
    @Session() session: AdminSession
  ): Promise<V1InvitationResponse> {
    const invitation = await this.adminInvitationsService.inviteMember(
      session.session.activeOrganizationId,
      { email: body.email, roleId: body.roleId },
      session.user.id
    )
    if (!invitation) {
      throw new HttpException(
        'Invitation creation failed: no record returned',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
    return mapToInvitationResponse(invitation)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('members:delete')
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  @ApiResponse({ status: 204, description: 'Invitation revoked' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async revokeInvitation(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Session() session: AdminSession
  ): Promise<void> {
    await this.adminInvitationsService.revokeInvitation(
      id,
      session.session.activeOrganizationId,
      session.user.id
    )
  }
}
