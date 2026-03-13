import { Inject, Injectable, Logger } from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import { members } from '../../database/schema/auth.schema.js'
import { permissions, rolePermissions, roles } from '../../database/schema/rbac.schema.js'
import type { PermissionRow, RbacRepository, RoleRow } from '../rbac.repository.js'

@Injectable()
export class DrizzleRbacRepository implements RbacRepository {
  private readonly logger = new Logger(DrizzleRbacRepository.name)

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listRoles(tx?: DrizzleTx): Promise<RoleRow[]> {
    const qb = tx ?? this.db
    return qb.select().from(roles)
  }

  async findRoleBySlug(
    tenantId: string,
    slug: string,
    tx: DrizzleTx
  ): Promise<{ id: string } | undefined> {
    const qb = tx ?? this.db
    const [role] = await qb
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.slug, slug)))
      .limit(1)
    return role
  }

  async insertRole(
    data: {
      tenantId: string
      name: string
      slug: string
      description: string | null
      isDefault: boolean
    },
    tx: DrizzleTx
  ): Promise<RoleRow | undefined> {
    const qb = tx ?? this.db
    const [role] = await qb.insert(roles).values(data).returning()
    return role
  }

  async findRoleById(roleId: string, tx?: DrizzleTx): Promise<RoleRow | undefined> {
    const qb = tx ?? this.db
    const [role] = await qb.select().from(roles).where(eq(roles.id, roleId)).limit(1)
    return role
  }

  async updateRole(
    roleId: string,
    updates: { name?: string; slug?: string; description?: string | null },
    tx?: DrizzleTx
  ): Promise<void> {
    const qb = tx ?? this.db
    await qb.update(roles).set(updates).where(eq(roles.id, roleId))
  }

  async deleteRolePermissions(roleId: string, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))
  }

  async deleteRole(roleId: string, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb.delete(roles).where(eq(roles.id, roleId))
  }

  async findViewerRole(tenantId: string, tx?: DrizzleTx): Promise<{ id: string } | undefined> {
    const qb = tx ?? this.db
    const [viewerRole] = await qb
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.slug, 'viewer')))
      .limit(1)
    return viewerRole
  }

  async reassignMembersToRole(fromRoleId: string, toRoleId: string, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb.update(members).set({ roleId: toRoleId }).where(eq(members.roleId, fromRoleId))
  }

  async getAllPermissions(
    tx: DrizzleTx
  ): Promise<{ id: string; resource: string; action: string }[]> {
    const qb = tx ?? this.db
    return qb
      .select({ id: permissions.id, resource: permissions.resource, action: permissions.action })
      .from(permissions)
  }

  async insertRolePermissions(
    inserts: { roleId: string; permissionId: string }[],
    tx: DrizzleTx
  ): Promise<void> {
    const qb = tx ?? this.db
    if (inserts.length > 0) {
      await qb.insert(rolePermissions).values(inserts)
    }
  }

  async listRolesWithPermissions(
    tx?: DrizzleTx
  ): Promise<(RoleRow & { permissions: PermissionRow[] })[]> {
    const qb = tx ?? this.db
    const allRoles = await qb.select().from(roles)
    if (allRoles.length === 0) return []

    const roleIds = allRoles.map((r) => r.id)
    const rows = await qb
      .select({
        roleId: rolePermissions.roleId,
        id: permissions.id,
        resource: permissions.resource,
        action: permissions.action,
        description: permissions.description,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(inArray(rolePermissions.roleId, roleIds))

    const permsByRole = new Map<string, PermissionRow[]>()
    for (const row of rows) {
      const list = permsByRole.get(row.roleId) ?? []
      list.push({
        id: row.id,
        resource: row.resource,
        action: row.action,
        description: row.description,
      })
      permsByRole.set(row.roleId, list)
    }

    return allRoles.map((role) => ({ ...role, permissions: permsByRole.get(role.id) ?? [] }))
  }

  async getRolePermissions(roleId: string, tx?: DrizzleTx): Promise<PermissionRow[]> {
    const qb = tx ?? this.db
    return qb
      .select({
        id: permissions.id,
        resource: permissions.resource,
        action: permissions.action,
        description: permissions.description,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId))
  }

  async seedDefaultRoles(
    organizationId: string,
    defaultRoles: {
      name: string
      slug: string
      description: string | null
      permissions: string[]
    }[],
    tx: DrizzleTx
  ): Promise<void> {
    const qb = tx ?? this.db
    for (const def of defaultRoles) {
      const [role] = await qb
        .insert(roles)
        .values({
          tenantId: organizationId,
          name: def.name,
          slug: def.slug,
          description: def.description,
          isDefault: true,
        })
        .returning()

      if (!role) {
        this.logger.warn(`Failed to insert default role "${def.name}" for org ${organizationId}`)
        continue
      }

      const allPerms = await qb.select().from(permissions)
      const permMap = new Map(allPerms.map((p) => [`${p.resource}:${p.action}`, p.id]))

      const inserts = def.permissions
        .map((perm) => ({ roleId: role.id, permissionId: permMap.get(perm) }))
        .filter((e): e is { roleId: string; permissionId: string } => Boolean(e.permissionId))

      if (inserts.length > 0) {
        await qb.insert(rolePermissions).values(inserts)
      }
    }
  }
}
