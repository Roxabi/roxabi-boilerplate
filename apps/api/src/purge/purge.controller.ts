import { timingSafeEqual } from 'node:crypto'
import { Controller, Headers, Post, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AllowAnonymous } from '../auth/decorators/allowAnonymous.js'
import { PurgeService } from './purge.service.js'

@ApiTags('Internal')
@Controller('api/internal')
export class PurgeController {
  constructor(
    private readonly purgeService: PurgeService,
    private readonly configService: ConfigService
  ) {}

  @Post('purge')
  @AllowAnonymous()
  @ApiOperation({ summary: 'GDPR purge cron — anonymize expired soft-deleted records' })
  @ApiResponse({ status: 200, description: 'Purge completed' })
  @ApiResponse({ status: 401, description: 'Invalid cron secret' })
  async purge(@Headers('authorization') authorization?: string) {
    const cronSecret = this.configService.get<string>('CRON_SECRET')
    const token = authorization?.replace('Bearer ', '')
    const valid =
      cronSecret &&
      token &&
      cronSecret.length === token.length &&
      timingSafeEqual(Buffer.from(token), Buffer.from(cronSecret))
    if (!valid) {
      throw new UnauthorizedException('Invalid cron secret')
    }

    return this.purgeService.runPurge()
  }
}
