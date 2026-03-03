import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { FastifyRequest } from 'fastify'
import {
  ORGANIZATION_CREATED,
  OrganizationCreatedEvent,
} from '../common/events/organizationCreated.event.js'
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider.js'
import { EMAIL_PROVIDER, type EmailProvider } from '../email/email.provider.js'
import { PermissionService } from '../rbac/permission.service.js'
import { type BetterAuthInstance, createBetterAuth } from './auth.instance.js'
import { toFetchHeaders } from './fastifyHeaders.js'

@Injectable()
export class AuthService {
  private readonly auth: BetterAuthInstance
  readonly enabledProviders: { google: boolean; github: boolean }

  constructor(
    @Inject(DRIZZLE) db: DrizzleDB,
    @Inject(EMAIL_PROVIDER) emailProvider: EmailProvider,
    config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly permissionService: PermissionService
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
      emailProvider,
      {
        secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
        baseURL: config.get<string>('BETTER_AUTH_URL', 'http://localhost:4000'),
        appURL: config.get<string>('APP_URL', 'http://localhost:3000'),
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

  async getSession(request: FastifyRequest) {
    const headers = toFetchHeaders(request)
    const session = await this.auth.api.getSession({ headers })

    if (!session) return session

    const orgId = session.session?.activeOrganizationId
    let permissions: string[] = []

    if (orgId && session.user?.id) {
      permissions = await this.permissionService.getPermissions(session.user.id, orgId)
    }

    return { ...session, permissions }
  }
}
