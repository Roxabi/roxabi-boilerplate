import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Role } from '@repo/types'
import type { FastifyRequest } from 'fastify'
import { ApiKeyService } from '../api-key/apiKey.service.js'
import { ApiKeyInvalidException } from '../api-key/exceptions/apiKeyInvalid.exception.js'
import { ErrorCode } from '../common/errorCodes.js'
import { PermissionService } from '../rbac/permission.service.js'
import { UserService } from '../user/user.service.js'
import { SessionEnrichmentService } from './sessionEnrichment.service.js'
import type { AuthenticatedSession } from './types.js'

function isAuthenticatedSession(value: unknown): value is AuthenticatedSession {
  if (value === null || value === undefined) return false
  const v = value as Record<string, unknown>
  if (typeof v.user !== 'object' || v.user === null) return false
  if (typeof v.session !== 'object' || v.session === null) return false
  const user = v.user as Record<string, unknown>
  const session = v.session as Record<string, unknown>
  return (
    typeof user.id === 'string' && typeof session.id === 'string' && Array.isArray(v.permissions)
  )
}

type AuthenticatedRequest = FastifyRequest & {
  session: AuthenticatedSession | null
  user: AuthenticatedSession['user'] | null
}

// Routes accessible to soft-deleted users
const SOFT_DELETED_ALLOWED_ROUTES = [
  { method: 'POST', path: '/api/users/me/reactivate' },
  { method: 'GET', path: '/api/users/me' },
  { method: 'GET', path: '/api/session' },
  { method: 'GET', path: '/api/gdpr/export' },
  { method: 'POST', path: '/api/users/me/purge' },
  { method: 'GET', path: '/api/organizations' },
]

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)

  constructor(
    private readonly sessionEnrichmentService: SessionEnrichmentService,
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly apiKeyService: ApiKeyService,
    private readonly permissionService: PermissionService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireApiKey = this.reflector.getAllAndOverride<boolean>('REQUIRE_API_KEY', [
      context.getHandler(),
      context.getClass(),
    ])
    const isPublic = this.reflector.getAllAndOverride<boolean>('PUBLIC', [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic && !requireApiKey) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authHeader = request.headers?.authorization as string | undefined
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    const session = await this.resolveSession(request, bearerToken)
    request.session = session
    request.user = session?.user ?? null

    if (requireApiKey && session?.actorType !== 'api_key') {
      throw new UnauthorizedException({
        message: 'API key required',
        errorCode: ErrorCode.API_KEY_REQUIRED,
      })
    }

    const isOptional = this.reflector.getAllAndOverride<boolean>('OPTIONAL_AUTH', [
      context.getHandler(),
      context.getClass(),
    ])
    if (!session && isOptional) return true
    if (!session) throw new UnauthorizedException()

    await this.runPostAuthChecks(context, request, session)
    return true
  }

  private async resolveSession(
    request: AuthenticatedRequest,
    bearerToken: string | null
  ): Promise<AuthenticatedSession | null> {
    if (bearerToken?.startsWith('sk_live_')) {
      try {
        return await this.buildApiKeySession(bearerToken)
      } catch (err) {
        if (err instanceof ApiKeyInvalidException) {
          this.logger.warn(`[resolveSession] API key rejected: ${err.errorCode}`, {
            errorCode: err.errorCode,
          })
          throw new UnauthorizedException({
            message: 'Unauthorized',
            errorCode: ErrorCode.API_KEY_UNAUTHORIZED,
          })
        }
        throw err
      }
    }
    const raw = await this.sessionEnrichmentService.getEnrichedSession(request)
    if (!isAuthenticatedSession(raw)) return null
    return { ...raw, actorType: 'user' as const }
  }

  private async buildApiKeySession(token: string): Promise<AuthenticatedSession> {
    const keyData = await this.apiKeyService.validateBearerToken(token)
    const orgPermissions = await this.permissionService.getPermissions(
      keyData.userId,
      keyData.tenantId
    )
    // Intersect key scopes with org's current permissions to prevent stale elevated access
    const effectiveScopes = keyData.scopes.filter((s) => orgPermissions.includes(s))
    try {
      this.apiKeyService.touchLastUsedAt(keyData.id)
    } catch {
      // fire-and-forget — never block auth on a last-used update failure
    }
    return {
      user: { id: keyData.userId, role: keyData.role as Role },
      session: { id: keyData.id, activeOrganizationId: keyData.tenantId },
      permissions: effectiveScopes,
      actorType: 'api_key',
      apiKeyId: keyData.id,
    }
  }

  private async runPostAuthChecks(
    context: ExecutionContext,
    request: AuthenticatedRequest,
    session: AuthenticatedSession
  ): Promise<void> {
    if (session.actorType !== 'api_key') {
      await this.checkSoftDeleted(request, session)
    }
    this.checkRoles(context, session)
    this.checkOrgRequired(context, session)
    this.checkPermissions(context, session)
  }

  private async checkSoftDeleted(request: AuthenticatedRequest, session: AuthenticatedSession) {
    const user = await this.userService.getSoftDeleteStatus(session.user.id)

    if (!user?.deletedAt) return

    const method = request.method.toUpperCase()
    const path = request.url?.split('?')[0]

    const isAllowed = SOFT_DELETED_ALLOWED_ROUTES.some(
      (route) => route.method === method && path === route.path
    )

    if (!isAllowed) {
      throw new ForbiddenException({
        message: 'Account is scheduled for deletion',
        errorCode: ErrorCode.ACCOUNT_SCHEDULED_FOR_DELETION,
        deleteScheduledFor: user.deleteScheduledFor?.toISOString(),
      })
    }
  }

  private checkRoles(context: ExecutionContext, session: AuthenticatedSession) {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('ROLES', [
      context.getHandler(),
      context.getClass(),
    ])

    if (session.actorType === 'api_key') {
      // API key sessions skip role checks, but role-gated routes must also declare @Permissions()
      // to be accessible via API key. Without @Permissions(), the route is role-only.
      if (requiredRoles?.length) {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>('PERMISSIONS', [
          context.getHandler(),
          context.getClass(),
        ])
        if (!requiredPermissions?.length) {
          throw new ForbiddenException({
            message: 'API key cannot access role-gated routes without @Permissions()',
            errorCode: ErrorCode.API_KEY_SCOPE_DENIED,
          })
        }
      }
      return
    }

    if (requiredRoles?.length) {
      const userRole = session.user.role ?? 'user'
      if (!requiredRoles.includes(userRole)) throw new ForbiddenException()
    }
  }

  private checkOrgRequired(context: ExecutionContext, session: AuthenticatedSession) {
    const requireOrg = this.reflector.getAllAndOverride<boolean>('REQUIRE_ORG', [
      context.getHandler(),
      context.getClass(),
    ])
    if (requireOrg && !session.session.activeOrganizationId) {
      throw new ForbiddenException('No active organization')
    }
  }

  private checkPermissions(context: ExecutionContext, session: AuthenticatedSession) {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('PERMISSIONS', [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredPermissions?.length) return

    const orgId = session.session.activeOrganizationId
    if (!orgId) {
      throw new ForbiddenException('No active organization')
    }

    // Superadmin bypass is suppressed for API key auth — scope checks always apply
    if (session.user.role === 'superadmin' && session.actorType !== 'api_key') return

    // Permissions are already resolved by SessionEnrichmentService and attached to the session
    const hasAll = requiredPermissions.every((p) => session.permissions.includes(p))
    if (!hasAll) {
      if (session.actorType === 'api_key') {
        throw new ForbiddenException({
          message: 'API key does not have required scope',
          errorCode: ErrorCode.API_KEY_SCOPE_DENIED,
        })
      }
      throw new ForbiddenException('Insufficient permissions')
    }
  }
}
