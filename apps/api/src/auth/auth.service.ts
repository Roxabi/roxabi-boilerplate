import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { FastifyRequest } from 'fastify'
import {
  ORGANIZATION_CREATED,
  OrganizationCreatedEvent,
} from '../common/events/organizationCreated.event.js'
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider.js'
import { QUEUE_SERVICE, type QueueEnqueuer } from '../queue/queue.provider.js'
import { type BetterAuthInstance, createBetterAuth } from './auth.instance.js'
import { toFetchHeaders } from './fastifyHeaders.js'

@Injectable()
export class AuthService {
  private readonly auth: BetterAuthInstance
  readonly enabledProviders: { google: boolean; github: boolean }

  constructor(
    @Inject(DRIZZLE) db: DrizzleDB, // RLS-BYPASS: better-auth-adapter
    @Inject(QUEUE_SERVICE) private readonly queueService: QueueEnqueuer,
    config: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    const googleClientId = config.get<string>('GOOGLE_CLIENT_ID')
    const googleClientSecret = config.get<string>('GOOGLE_CLIENT_SECRET')
    const githubClientId = config.get<string>('GITHUB_CLIENT_ID')
    const githubClientSecret = config.get<string>('GITHUB_CLIENT_SECRET')

    this.enabledProviders = {
      google: Boolean(googleClientId && googleClientSecret),
      github: Boolean(githubClientId && githubClientSecret),
    }

    this.auth = createBetterAuth(
      db,
      this.queueService,
      {
        secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
        baseURL: config.getOrThrow<string>('BETTER_AUTH_URL'),
        appURL: config.getOrThrow<string>('APP_URL'),
        appName: config.getOrThrow<string>('APP_NAME'),
        googleClientId,
        googleClientSecret,
        githubClientId,
        githubClientSecret,
      },
      async ({ organizationId, creatorUserId }) => {
        await this.eventEmitter.emitAsync(
          ORGANIZATION_CREATED,
          new OrganizationCreatedEvent(organizationId, creatorUserId)
        )
      }
    )
  }

  async handler(request: Request): Promise<Response> {
    return this.auth.handler(request)
  }

  async getRawSession(request: FastifyRequest) {
    const headers = toFetchHeaders(request)
    return this.auth.api.getSession({ headers })
  }
}
