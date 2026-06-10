import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider.js'
import { whereActive } from '../database/helpers/whereActive.js'
import { members } from '../database/schema/auth.schema.js'
import { permissions, rolePermissions } from '../database/schema/rbac.schema.js'

/**
 * Resolves RBAC permissions for users within organizations.
 *
 * This service intentionally uses the raw DB connection (not TenantService.queryAs)
 * because it runs in auth context before tenant context is established. The WHERE
 * clauses on userId and organizationId in each query provide equivalent row-level
 * isolation to RLS policies.
 */
@Injectable()
export class PermissionService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {} // RLS-BYPASS: RBAC resolution — cross-tenant permission queries

  /**
   * Resolve permissions for a user in an organization.
   * Used by AuthGuard and session extension.
   */
  async getPermissions(userId: string, organizationId: string): Promise<string[]> {
    const member = await this.db
      .select({ roleId: members.roleId })
      .from(members)
      .where(
        and(
          eq(members.userId, userId),
          eq(members.organizationId, organizationId),
          whereActive(members)
        )
      )
      .limit(1)

    const roleId = member[0]?.roleId
    if (!roleId) return []

    const rows = await this.db
      .select({
        resource: permissions.resource,
        action: permissions.action,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId))

    return rows.map((r) => `${r.resource}:${r.action}`)
  }

  /**
   * Check if a user has a specific permission in an organization.
   */
  async hasPermission(
    userId: string,
    organizationId: string,
    permission: string
  ): Promise<boolean> {
    const perms = await this.getPermissions(userId, organizationId)
    return perms.includes(permission)
  }

  /**
   * Get all available permissions (for role management endpoints).
   */
  async getAllPermissions() {
    return this.db.select().from(permissions)
  }
}
