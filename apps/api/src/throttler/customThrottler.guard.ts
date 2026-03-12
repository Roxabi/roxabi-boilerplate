import { type ExecutionContext, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  ThrottlerException,
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerRequest,
} from '@nestjs/throttler'

const AUTH_SENSITIVE_PATHS = [
  '/api/auth/sign-in',
  '/api/auth/sign-up',
  '/api/auth/request-password-reset',
  '/api/auth/resetPassword',
  '/api/auth/magic-link',
  '/api/auth/change-password',
  '/api/auth/verify-email',
  '/api/auth/send-verification-email',
  '/api/users/me/purge',
]

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  @Inject(ConfigService)
  private readonly configService!: ConfigService

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const enabled = this.configService.get<boolean>('RATE_LIMIT_ENABLED', true)
    if (enabled === false) {
      return true
    }
    return super.canActivate(context)
  }

  // biome-ignore lint/suspicious/noExplicitAny: matches @nestjs/throttler ThrottlerGuard.getTracker signature
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const user = req.user as { id?: string } | undefined
    if (user?.id) return `user:${user.id}`
    return `ip:${req.ip}`
  }

  protected override async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration, generateKey } = requestProps

    // Skip auth tier for non-sensitive paths
    if (throttler.name === 'auth' && !this.shouldApplyAuthTier(context)) {
      return true
    }

    // Skip api tier for non-API-key requests
    if (throttler.name === 'api') {
      const { req: apiReq } = this.getRequestResponse(context)
      const session = apiReq.session as { actorType?: string; apiKeyId?: string } | undefined
      if (session?.actorType !== 'api_key' || !session.apiKeyId) return true

      const tracker = `apikey:${session.apiKeyId}`
      const key = generateKey(context, tracker, 'api')

      const { totalHits, timeToExpire, isBlocked, timeToBlockExpire } =
        await this.storageService.increment(key, ttl, limit, blockDuration, 'api')

      const remaining = Math.max(0, limit - totalHits)
      const reset = Math.floor(Date.now() / 1000) + Math.ceil(timeToExpire / 1000)

      apiReq.throttlerMeta = {
        limit,
        remaining,
        reset,
        tierName: 'api',
        tracker,
      }

      if (isBlocked || totalHits > limit) {
        apiReq.throttlerMeta.remaining = 0
        await this.throwThrottlingException(context, {
          limit,
          ttl,
          key,
          tracker,
          totalHits,
          timeToExpire,
          isBlocked,
          timeToBlockExpire,
        })
      }

      return true
    }

    const { req } = this.getRequestResponse(context)
    const tracker = await this.getTracker(req)
    const key = generateKey(context, tracker, throttler.name ?? 'default')

    const { totalHits, timeToExpire, isBlocked, timeToBlockExpire } =
      await this.storageService.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttler.name ?? 'default'
      )

    const remaining = Math.max(0, limit - totalHits)
    const reset = Math.floor(Date.now() / 1000) + Math.ceil(timeToExpire / 1000)

    // When both global and auth tiers apply, the last tier's metadata overwrites — this is intentional
    // throttlerMeta MUST be set before throwThrottlingException — the AllExceptionsFilter reads it for 429 headers
    req.throttlerMeta = {
      limit,
      remaining,
      reset,
      tierName: throttler.name ?? 'default',
      tracker,
    }

    if (isBlocked || totalHits > limit) {
      // Store metadata before throwing
      req.throttlerMeta.remaining = 0

      await this.throwThrottlingException(context, {
        limit,
        ttl,
        key,
        tracker,
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
      })
    }

    return true
  }

  protected override async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail
  ): Promise<void> {
    // Throw without setting headers — AllExceptionsFilter handles headers
    throw new ThrottlerException()
  }

  protected shouldApplyAuthTier(context: ExecutionContext): boolean {
    const { req } = this.getRequestResponse(context)
    const path = (req.url as string)?.split('?')[0]
    return AUTH_SENSITIVE_PATHS.some((p) => path === p || path?.startsWith(`${p}/`))
  }
}

export { AUTH_SENSITIVE_PATHS }
