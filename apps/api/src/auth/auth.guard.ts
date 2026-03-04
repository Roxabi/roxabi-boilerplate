import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Role } from '@repo/types'
import type { FastifyRequest } from 'fastify'
import { ApiKeyService } from '../api-key/apiKey.service.js'
import { ErrorCode } from '../common/errorCodes.js'
import { PermissionService } from '../rbac/permission.service.js'
import { UserService } from '../user/user.service.js'
import { AuthService } from './auth.service.js'
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
  constructor(
    private readonly authService: AuthService,
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

    // --- API key Bearer fallback ---
    const authHeader = request.headers?.['authorization'] as string | undefined
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    let session: AuthenticatedSession | null = null

    if (bearerToken?.startsWith('sk_live_')) {
      // API key path — throws on invalid/revoked/expired
      const keyData = await this.apiKeyService.validateBearerToken(bearerToken)
      const orgPermissions = await this.permissionService.getPermissions(
        keyData.userId,
        keyData.tenantId
      )
      const effectiveScopes = keyData.scopes.filter((s) => orgPermissions.includes(s))

      session = {
        user: { id: keyData.userId, role: (keyData.role ?? 'user') as Role },
        session: { id: keyData.id, activeOrganizationId: keyData.tenantId },
        permissions: effectiveScopes,
        actorType: 'api_key',
        apiKeyId: keyData.id,
      }

      // fire-and-forget lastUsedAt update
      this.apiKeyService.touchLastUsedAt(keyData.id)
    } else {
      // Session auth path (existing behavior)
      const raw = await this.authService.getSession(request)
      session = isAuthenticatedSession(raw) ? raw : null
    }

    request.session = session
    request.user = session?.user ?? null

    // @RequireApiKey(): reject non-API-key auth
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

    // Soft-delete check — session auth only
    if (session.actorType !== 'api_key') {
      await this.checkSoftDeleted(request, session)
    }

    // Roles — skip for API key auth
    if (session.actorType !== 'api_key') {
      this.checkRoles(context, session)
    }

    this.checkOrgRequired(context, session)
    this.checkPermissions(context, session)

    return true
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

    // Permissions are already resolved by AuthService.getSession() and attached to the session
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
