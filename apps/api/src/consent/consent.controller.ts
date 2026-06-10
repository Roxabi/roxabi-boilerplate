import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { OptionalAuth } from '../auth/decorators/optionalAuth.js'
import { Session } from '../auth/decorators/session.decorator.js'
import { ZodValidationPipe } from '../common/pipes/zodValidation.pipe.js'
import { ConsentService } from './consent.service.js'

const consentCategoriesSchema = z.object({
  necessary: z.literal(true),
  analytics: z.boolean(),
  marketing: z.boolean(),
})

const saveConsentSchema = z.object({
  categories: consentCategoriesSchema,
  policyVersion: z.string().min(1),
  action: z.enum(['accepted', 'rejected', 'customized']),
})

type SaveConsentDto = z.infer<typeof saveConsentSchema>

const CONSENT_COOKIE_NAME = 'consent'
const CONSENT_COOKIE_MAX_AGE = 15778800 // ~6 months in seconds

@ApiTags('Consent')
@Controller('api/consent')
export class ConsentController {
  private readonly isProduction: boolean

  constructor(
    private readonly consentService: ConsentService,
    config: ConfigService
  ) {
    this.isProduction = config.get<string>('NODE_ENV') === 'production'
  }

  @Post()
  @OptionalAuth()
  @HttpCode(201)
  @ApiOperation({ summary: 'Save user consent preferences' })
  @ApiResponse({ status: 201, description: 'Consent saved (authenticated user - DB + cookie)' })
  @ApiResponse({ status: 204, description: 'Consent saved (anonymous user - cookie only)' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  async saveConsent(
    @Session() session: { user: { id: string } } | null,
    @Body(new ZodValidationPipe(saveConsentSchema)) body: SaveConsentDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const consentedAt = new Date().toISOString()

    const cookiePayload = JSON.stringify({
      categories: body.categories,
      consentedAt,
      policyVersion: body.policyVersion,
      action: body.action,
    })

    if (!session) {
      // httpOnly is intentionally false — the frontend reads this cookie client-side
      // to hydrate the consent banner without an extra API call.
      reply.setCookie(CONSENT_COOKIE_NAME, cookiePayload, {
        path: '/',
        sameSite: 'lax',
        maxAge: CONSENT_COOKIE_MAX_AGE,
        secure: this.isProduction,
        httpOnly: false,
      })
      reply.status(204)
      return
    }

    const ipAddress = request.ip ?? null
    const userAgent = request.headers['user-agent'] ?? null

    const record = await this.consentService.saveConsent(session.user.id, {
      ...body,
      ipAddress,
      userAgent,
    })

    // Set cookie only after DB write succeeds to avoid DB/cookie mismatch on failure
    reply.setCookie(CONSENT_COOKIE_NAME, cookiePayload, {
      path: '/',
      sameSite: 'lax',
      maxAge: CONSENT_COOKIE_MAX_AGE,
      secure: this.isProduction,
      httpOnly: false,
    })

    return record
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get latest consent record for authenticated user' })
  @ApiResponse({ status: 200, description: 'Latest consent record' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'No consent record found' })
  async getConsent(@Session() session: { user: { id: string } }) {
    return this.consentService.getLatestConsent(session.user.id)
  }
}
