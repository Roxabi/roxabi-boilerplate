import { Logger, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { CustomThrottlerGuard } from './customThrottler.guard.js'
import { UpstashThrottlerStorage } from './upstashThrottlerStorage.js'

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('ThrottlerConfigModule')
        const rateLimitEnabled = config.get<boolean>('RATE_LIMIT_ENABLED', true)
        if (rateLimitEnabled === false) {
          logger.warn(
            'Rate limiting is DISABLED (RATE_LIMIT_ENABLED=false). This should only be used for emergencies.'
          )
        }

        const upstashUrl = config.get<string>('KV_REST_API_URL')
        const upstashToken = config.get<string>('KV_REST_API_TOKEN')
        const upstashConfigured = Boolean(upstashUrl && upstashToken)

        if (upstashConfigured) {
          logger.log('Rate limiting using Upstash Redis storage')
        } else {
          logger.warn('Rate limiting using in-memory storage — not suitable for production')
        }

        // Values always defined — applyRateLimitPreset() in env.validation.ts guarantees concrete values
        // RATE_LIMIT_API_TTL / RATE_LIMIT_API_LIMIT are reserved for a future API-key throttler tier
        return {
          throttlers: [
            {
              name: 'global',
              ttl: config.get<number>('RATE_LIMIT_GLOBAL_TTL')!,
              limit: config.get<number>('RATE_LIMIT_GLOBAL_LIMIT')!,
              setHeaders: false,
            },
            {
              name: 'auth',
              ttl: config.get<number>('RATE_LIMIT_AUTH_TTL')!,
              limit: config.get<number>('RATE_LIMIT_AUTH_LIMIT')!,
              blockDuration: config.get<number>('RATE_LIMIT_AUTH_BLOCK_DURATION')!,
              setHeaders: false,
            },
          ],
          // Intentional: UpstashThrottlerStorage is a stateless adapter (no DI dependencies), so we instantiate it directly instead of going through the NestJS container
          storage: upstashConfigured
            ? new UpstashThrottlerStorage(upstashUrl as string, upstashToken as string)
            : undefined,
        }
      },
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: CustomThrottlerGuard }],
})
export class ThrottlerConfigModule {}
