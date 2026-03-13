import type { DrizzleTx } from '../database/drizzle.provider.js'
import type { RoleRow } from './rbac.types.js'

export const RBAC_REPO = Symbol('RBAC_REPO')

export type { RoleRow }

export type PermissionRow = {
  id: string
  resource: string
  action: string
  description: string
}

export interface RbacRepository {
  listRoles(tx?: DrizzleTx): Promise<RoleRow[]>

  findRoleBySlug(
    tenantId: string,
    slug: string,
    tx?: DrizzleTx
  ): Promise<{ id: string } | undefined>

  insertRole(
    data: {
      tenantId: string
      name: string
      slug: string
      description: string | null
      isDefault: boolean
    },
    tx?: DrizzleTx
  ): Promise<RoleRow | undefined>

  findRoleById(roleId: string, tx?: DrizzleTx): Promise<RoleRow | undefined>

  updateRole(
    roleId: string,
    updates: { name?: string; slug?: string; description?: string | null },
    tx?: DrizzleTx
  ): Promise<void>

  deleteRolePermissions(roleId: string, tx?: DrizzleTx): Promise<void>

  deleteRole(roleId: string, tx?: DrizzleTx): Promise<void>

  findViewerRole(tenantId: string, tx?: DrizzleTx): Promise<{ id: string } | undefined>

  reassignMembersToRole(fromRoleId: string, toRoleId: string, tx?: DrizzleTx): Promise<void>

  getAllPermissions(tx?: DrizzleTx): Promise<{ id: string; resource: string; action: string }[]>

  insertRolePermissions(
    inserts: { roleId: string; permissionId: string }[],
    tx?: DrizzleTx
  ): Promise<void>

  getRolePermissions(roleId: string, tx?: DrizzleTx): Promise<PermissionRow[]>

  listRolesWithPermissions(tx?: DrizzleTx): Promise<(RoleRow & { permissions: PermissionRow[] })[]>

  seedDefaultRoles(
    organizationId: string,
    roles: {
      name: string
      slug: string
      description: string | null
      permissions: string[]
    }[],
    tx?: DrizzleTx
  ): Promise<void>
}
