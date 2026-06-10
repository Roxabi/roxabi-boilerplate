import {
  type CallHandler,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { FastifyRequest } from 'fastify'
import { ClsService } from 'nestjs-cls'
import { from, type Observable, switchMap } from 'rxjs'
import { SKIP_ORG_KEY } from '../common/decorators/skipOrg.decorator.js'
import { TenantResolutionException } from './exceptions/tenantResolution.exception.js'
import { DeletedOrgRestrictionService } from './services/deletedOrgRestriction.service.js'
import { TENANT_REPO, type TenantRepository } from './tenant.repository.js'

type AuthenticatedRequest = FastifyRequest & {
  session?: {
    session: { activeOrganizationId?: string | null }
  } | null
}

/**
 * CLS key used to cache the resolved org ID -> tenant ID mapping
 * within a single request. Prevents repeated DB lookups when the
 * interceptor runs for the same activeOrganizationId.
 */
const CLS_RESOLVED_TENANT_KEY = 'resolvedTenantMap'

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantInterceptor.name)

  constructor(
    private readonly cls: ClsService,
    private readonly reflector: Reflector,
    @Inject(TENANT_REPO) private readonly tenantRepo: TenantRepository,
    private readonly deletedOrgRestrictionService: DeletedOrgRestrictionService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skipOrg = this.reflector.getAllAndOverride<boolean>(SKIP_ORG_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (skipOrg) {
      return next.handle()
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const activeOrganizationId = request.session?.session?.activeOrganizationId ?? null

    if (!activeOrganizationId) {
      this.cls.set('tenantId', null)
      return next.handle()
    }

    // Fast path: if we already resolved this org ID in this request, reuse it
    const cached = this.getCachedTenantId(activeOrganizationId)
    if (cached !== undefined) {
      this.cls.set('tenantId', cached)
      return next.handle()
    }

    // Resolve child org -> parent org asynchronously
    return from(this.resolveParentOrg(activeOrganizationId, request)).pipe(
      switchMap((tenantId) => {
        this.cls.set('tenantId', tenantId)
        this.setCachedTenantId(activeOrganizationId, tenantId)
        return next.handle()
      })
    )
  }

  /**
   * Resolves the tenant ID for a given organization.
   *
   * Also checks if the organization is soft-deleted and blocks
   * non-allowed operations if so.
   */
  private async resolveParentOrg(orgId: string, request: AuthenticatedRequest): Promise<string> {
    try {
      const org = await this.tenantRepo.lookupOrganization(orgId)

      if (!org) {
        this.logger.warn(`Organization ${orgId} not found during tenant resolution`)
        return orgId
      }

      if (org.deletedAt) {
        this.deletedOrgRestrictionService.enforce(org, request)
      }

      // TODO(Phase 3, #389): Parent tenant resolution is formally deferred.
      // parentOrganizationId is present in the schema but the resolution
      // strategy (which context should inherit which tenant) is not yet designed.

      return orgId
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error
      }
      this.logger.error(`Failed to resolve parent org for ${orgId}`, error)
      // Fail closed (phase-1 spec): never proceed with an unverified tenant context
      throw new TenantResolutionException(`Failed to resolve tenant context for ${orgId}`)
    }
  }

  private getCachedTenantId(orgId: string): string | undefined {
    const map = this.cls.get(CLS_RESOLVED_TENANT_KEY) as Map<string, string> | undefined
    return map?.get(orgId)
  }

  private setCachedTenantId(orgId: string, tenantId: string): void {
    let map = this.cls.get(CLS_RESOLVED_TENANT_KEY) as Map<string, string> | undefined
    if (!map) {
      map = new Map()
      this.cls.set(CLS_RESOLVED_TENANT_KEY, map)
    }
    map.set(orgId, tenantId)
  }
}
