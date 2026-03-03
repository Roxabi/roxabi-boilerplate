import { Injectable, Logger } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { ClsService } from 'nestjs-cls'
import type { DrizzleTx } from '../database/drizzle.provider.js'
import { members } from '../database/schema/auth.schema.js'
import { permissions, rolePermissions, roles } from '../database/schema/rbac.schema.js'
import { TenantService } from '../tenant/tenant.service.js'
import { DefaultRoleException } from './exceptions/defaultRole.exception.js'
import { MemberNotFoundException } from './exceptions/memberNotFound.exception.js'
import { OwnershipConstraintException } from './exceptions/ownershipConstraint.exception.js'
import { RoleInsertFailedException } from './exceptions/roleInsertFailed.exception.js'
import { RoleNotFoundException } from './exceptions/roleNotFound.exception.js'
import { RoleSlugConflictException } from './exceptions/roleSlugConflict.exception.js'
import { DEFAULT_ROLES } from './rbac.constants.js'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name)

  constructor(
    private readonly tenantService: TenantService,
    private readonly cls: ClsService
  ) {}

  /**
   * Resolve permission strings to IDs and insert into role_permissions.
   * Shared by createRole, updateRole, and seedDefaultRoles.
   */
  private async syncPermissions(tx: DrizzleTx, roleId: string, permissionStrings: string[]) {
    if (permissionStrings.length === 0) return

    const allPerms = await tx.select().from(permissions)
    const permMap = new Map(allPerms.map((p) => [`${p.resource}:${p.action}`, p.id]))

    const inserts = permissionStrings
      .map((perm) => ({ roleId, permissionId: permMap.get(perm) }))
      .filter((e): e is { roleId: string; permissionId: string } => Boolean(e.permissionId))

    if (inserts.length > 0) {
      await tx.insert(rolePermissions).values(inserts)
    }
  }

  /**
   * List all roles for the current tenant organization.
   */
  async listRoles() {
    return this.tenantService.query((tx) => tx.select().from(roles))
  }

  /**
   * Create a custom role for the current tenant organization.
   */
  async createRole(data: { name: string; description?: string; permissions: string[] }) {
    const slug = slugify(data.name)
    const tenantId = this.cls.get('tenantId') as string

    return this.tenantService.query(async (tx) => {
      // Check for slug collision
      const existing = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.tenantId, tenantId), eq(roles.slug, slug)))
        .limit(1)

      if (existing.length > 0) {
        throw new RoleSlugConflictException(slug)
      }

      // Insert the role
      const [role] = await tx
        .insert(roles)
        .values({
          tenantId,
          name: data.name,
          slug,
          description: data.description ?? null,
          isDefault: false,
        })
        .returning()

      if (!role) throw new RoleInsertFailedException()

      await this.syncPermissions(tx, role.id, data.permissions)

      return role
    })
  }

  /**
   * Ensure the new slug doesn't collide with an existing role in the tenant.
   */
  private async ensureUniqueSlug(
    tx: DrizzleTx,
    tenantId: string,
    newSlug: string,
    currentSlug: string | undefined
  ) {
    if (newSlug === currentSlug) return
    const collision = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.slug, newSlug)))
      .limit(1)

    if (collision.length > 0) {
      throw new RoleSlugConflictException(newSlug)
    }
  }

  /**
   * Update a role's fields and/or permissions.
   */
  async updateRole(
    roleId: string,
    data: { name?: string; description?: string; permissions?: string[] }
  ) {
    return this.tenantService.query(async (tx) => {
      const existing = await tx.select().from(roles).where(eq(roles.id, roleId)).limit(1)

      if (existing.length === 0) {
        throw new RoleNotFoundException(roleId)
      }

      // Update role fields
      const updates: Record<string, unknown> = {}
      if (data.name !== undefined) {
        const newSlug = slugify(data.name)
        const tenantId = this.cls.get('tenantId') as string
        await this.ensureUniqueSlug(tx, tenantId, newSlug, existing[0]?.slug)
        updates.name = data.name
        updates.slug = newSlug
      }
      if (data.description !== undefined) {
        updates.description = data.description
      }

      if (Object.keys(updates).length > 0) {
        await tx.update(roles).set(updates).where(eq(roles.id, roleId))
      }

      // Re-sync permissions if provided
      if (data.permissions) {
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))
        await this.syncPermissions(tx, roleId, data.permissions)
      }

      // Return updated role
      const [updated] = await tx.select().from(roles).where(eq(roles.id, roleId))
      return updated
    })
  }

  /**
   * Delete a custom role. Members fallback to Viewer.
   */
  async deleteRole(roleId: string) {
    return this.tenantService.query(async (tx) => {
      const existing = await tx.select().from(roles).where(eq(roles.id, roleId)).limit(1)

      const role = existing[0]
      if (!role) {
        throw new RoleNotFoundException(roleId)
      }

      if (role.isDefault) {
        throw new DefaultRoleException('Cannot delete a default role')
      }

      // Find the Viewer role to reassign members
      const [viewerRole] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.tenantId, role.tenantId), eq(roles.slug, 'viewer')))
        .limit(1)

      // Reassign members to Viewer + delete role (atomic via tenant tx)
      if (viewerRole) {
        await tx.update(members).set({ roleId: viewerRole.id }).where(eq(members.roleId, roleId))
      }

      await tx.delete(roles).where(eq(roles.id, roleId))

      return { deleted: true }
    })
  }

  /**
   * Get permissions assigned to a specific role.
   */
  async getRolePermissions(roleId: string) {
    return this.tenantService.query(async (tx) => {
      const existing = await tx.select().from(roles).where(eq(roles.id, roleId)).limit(1)

      if (existing.length === 0) {
        throw new RoleNotFoundException(roleId)
      }

      const rows = await tx
        .select({
          id: permissions.id,
          resource: permissions.resource,
          action: permissions.action,
          description: permissions.description,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, roleId))

      return rows
    })
  }

  /**
   * Transfer ownership from current Owner to another Admin.
   */
  async transferOwnership(currentUserId: string, targetMemberId: string) {
    const tenantId = this.cls.get('tenantId') as string

    return this.tenantService.query(async (tx) => {
      const { ownerRole, adminRole } = await this.findOwnerAdminRoles(tx, tenantId)
      const currentMember = await this.verifyCurrentOwner(tx, currentUserId, tenantId, ownerRole.id)
      const targetMember = await this.verifyTargetAdmin(tx, targetMemberId, tenantId, adminRole.id)

      await tx.update(members).set({ roleId: adminRole.id }).where(eq(members.id, currentMember.id))
      await tx.update(members).set({ roleId: ownerRole.id }).where(eq(members.id, targetMember.id))

      return { transferred: true }
    })
  }

  private async findOwnerAdminRoles(tx: DrizzleTx, tenantId: string) {
    const defaultRoles = await tx
      .select()
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.isDefault, true)))

    const ownerRole = defaultRoles.find((r) => r.slug === 'owner')
    const adminRole = defaultRoles.find((r) => r.slug === 'admin')

    if (!(ownerRole && adminRole)) {
      throw new OwnershipConstraintException('Default roles not found')
    }
    return { ownerRole, adminRole }
  }

  private async verifyCurrentOwner(
    tx: DrizzleTx,
    userId: string,
    tenantId: string,
    ownerRoleId: string
  ) {
    const [member] = await tx
      .select()
      .from(members)
      .where(
        and(
          eq(members.userId, userId),
          eq(members.organizationId, tenantId),
          eq(members.roleId, ownerRoleId)
        )
      )
      .limit(1)

    if (!member) {
      throw new OwnershipConstraintException('Only the Owner can transfer ownership')
    }
    return member
  }

  private async verifyTargetAdmin(
    tx: DrizzleTx,
    memberId: string,
    tenantId: string,
    adminRoleId: string
  ) {
    const [member] = await tx
      .select()
      .from(members)
      .where(
        and(
          eq(members.id, memberId),
          eq(members.organizationId, tenantId),
          eq(members.roleId, adminRoleId)
        )
      )
      .limit(1)

    if (!member) {
      throw new OwnershipConstraintException('Target must be an Admin in the same organization')
    }
    return member
  }

  /**
   * Change a member's role within the organization.
   */
  async changeMemberRole(memberId: string, roleId: string) {
    const tenantId = this.cls.get('tenantId') as string

    return this.tenantService.query(async (tx) => {
      // Verify role exists in tenant
      const [role] = await tx
        .select()
        .from(roles)
        .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)))
        .limit(1)

      if (!role) {
        throw new RoleNotFoundException(roleId)
      }

      // Get the member being changed
      const [member] = await tx
        .select()
        .from(members)
        .where(and(eq(members.id, memberId), eq(members.organizationId, tenantId)))
        .limit(1)

      if (!member) {
        throw new MemberNotFoundException(memberId)
      }

      // Check if removing last Owner
      if (member.roleId) {
        const [currentRole] = await tx
          .select()
          .from(roles)
          .where(eq(roles.id, member.roleId))
          .limit(1)

        if (currentRole?.slug === 'owner' && role.slug !== 'owner') {
          // Count Owners
          const ownerMembers = await tx
            .select({ id: members.id })
            .from(members)
            .where(and(eq(members.organizationId, tenantId), eq(members.roleId, currentRole.id)))

          if (ownerMembers.length <= 1) {
            throw new OwnershipConstraintException(
              'Cannot remove the last Owner — transfer ownership first'
            )
          }
        }
      }

      await tx.update(members).set({ roleId }).where(eq(members.id, memberId))

      return { updated: true }
    })
  }

  /**
   * Seed default roles for a newly created organization.
   * Called on org creation event.
   */
  async seedDefaultRoles(organizationId: string) {
    await this.tenantService.queryAs(organizationId, async (tx) => {
      for (const def of DEFAULT_ROLES) {
        const [role] = await tx
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

        await this.syncPermissions(tx, role.id, def.permissions)
      }
    })
  }
}
