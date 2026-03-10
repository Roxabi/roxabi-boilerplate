import { Controller, Get, Header, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { FastifyReply } from 'fastify'
import { Session } from '../auth/decorators/session.decorator.js'
import { GdprService } from './gdpr.service.js'

@ApiTags('GDPR')
@ApiBearerAuth()
@Controller('api/gdpr')
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export all user data (GDPR data portability)' })
  @ApiResponse({ status: 200, description: 'JSON file download with all user data' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @Header('Content-Type', 'application/json')
  async exportUserData(
    @Session() session: { user: { id: string } },
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const data = await this.gdprService.exportUserData(session.user.id)

    const date = new Date().toISOString().split('T')[0]
    const slug = (process.env.APP_NAME ?? 'app').toLowerCase()
    reply.header('Content-Disposition', `attachment; filename="${slug}-data-export-${date}.json"`)

    return data
  }
}
