import { Inject, Injectable } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'
import { TenantService } from '../tenant/tenant.service.js'
import { DefaultRoleException } from './exceptions/defaultRole.exception.js'
import { RoleInsertFailedException } from './exceptions/roleInsertFailed.exception.js'
import { RoleNotFoundException } from './exceptions/roleNotFound.exception.js'
import { RoleSlugConflictException } from './exceptions/roleSlugConflict.exception.js'
import { DEFAULT_ROLES } from './rbac.constants.js'
import { RBAC_REPO, type RbacRepository } from './rbac.repository.js'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

@Injectable()
export class RbacService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly cls: ClsService,
    @Inject(RBAC_REPO) private readonly repo: RbacRepository
  ) {}

  /**
   * List all roles for the current tenant organization.
   */
  async listRoles() {
    return this.tenantService.query((tx) => this.repo.listRoles(tx))
  }

  /**
   * Create a custom role for the current tenant organization.
   */
  async createRole(data: { name: string; description?: string; permissions: string[] }) {
    const slug = slugify(data.name)
    const tenantId = this.cls.get('tenantId') as string

    return this.tenantService.query(async (tx) => {
      // Check for slug collision
      const existing = await this.repo.findRoleBySlug(tenantId, slug, tx)

      if (existing) {
        throw new RoleSlugConflictException(slug)
      }

      // Insert the role
      const role = await this.repo.insertRole(
        {
          tenantId,
          name: data.name,
          slug,
          description: data.description ?? null,
          isDefault: false,
        },
        tx
      )

      if (!role) throw new RoleInsertFailedException()

      // Resolve permission strings to IDs and insert into role_permissions
      if (data.permissions.length > 0) {
        const allPerms = await this.repo.getAllPermissions(tx)
        const permMap = new Map(allPerms.map((p) => [`${p.resource}:${p.action}`, p.id]))
        const inserts = data.permissions
          .map((perm) => ({ roleId: role.id, permissionId: permMap.get(perm) }))
          .filter((e): e is { roleId: string; permissionId: string } => Boolean(e.permissionId))
        await this.repo.insertRolePermissions(inserts, tx)
      }

      return role
    })
  }

  /**
   * Update a role's fields and/or permissions.
   */
  async updateRole(
    roleId: string,
    data: { name?: string; description?: string; permissions?: string[] }
  ) {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherent to multi-step role update with slug collision check and permission sync
    return this.tenantService.query(async (tx) => {
      const existing = await this.repo.findRoleById(roleId, tx)

      if (!existing) {
        throw new RoleNotFoundException(roleId)
      }

      // Update role fields
      const updates: { name?: string; slug?: string; description?: string | null } = {}
      if (data.name !== undefined) {
        const newSlug = slugify(data.name)
        const tenantId = this.cls.get('tenantId') as string
        // Ensure the new slug doesn't collide with an existing role in the tenant
        if (newSlug !== existing.slug) {
          const collision = await this.repo.findRoleBySlug(tenantId, newSlug, tx)
          if (collision) {
            throw new RoleSlugConflictException(newSlug)
          }
        }
        updates.name = data.name
        updates.slug = newSlug
      }
      if (data.description !== undefined) {
        updates.description = data.description
      }

      if (Object.keys(updates).length > 0) {
        await this.repo.updateRole(roleId, updates, tx)
      }

      // Re-sync permissions if provided
      if (data.permissions) {
        await this.repo.deleteRolePermissions(roleId, tx)
        if (data.permissions.length > 0) {
          const allPerms = await this.repo.getAllPermissions(tx)
          const permMap = new Map(allPerms.map((p) => [`${p.resource}:${p.action}`, p.id]))
          const inserts = data.permissions
            .map((perm) => ({ roleId, permissionId: permMap.get(perm) }))
            .filter((e): e is { roleId: string; permissionId: string } => Boolean(e.permissionId))
          await this.repo.insertRolePermissions(inserts, tx)
        }
      }

      // Return updated role
      return this.repo.findRoleById(roleId, tx)
    })
  }

  /**
   * Delete a custom role. Members fallback to Viewer.
   */
  async deleteRole(roleId: string) {
    return this.tenantService.query(async (tx) => {
      const role = await this.repo.findRoleById(roleId, tx)

      if (!role) {
        throw new RoleNotFoundException(roleId)
      }

      if (role.isDefault) {
        throw new DefaultRoleException('Cannot delete a default role')
      }

      // Find the Viewer role to reassign members
      const viewerRole = await this.repo.findViewerRole(role.tenantId, tx)

      // Reassign members to Viewer + delete role (atomic via tenant tx)
      if (viewerRole) {
        await this.repo.reassignMembersToRole(roleId, viewerRole.id, tx)
      }

      await this.repo.deleteRole(roleId, tx)

      return { deleted: true }
    })
  }

  /**
   * Get permissions assigned to a specific role.
   */
  async getRolePermissions(roleId: string) {
    return this.tenantService.query(async (tx) => {
      const existing = await this.repo.findRoleById(roleId, tx)

      if (!existing) {
        throw new RoleNotFoundException(roleId)
      }

      return this.repo.getRolePermissions(roleId, tx)
    })
  }

  /**
   * List all roles for the current tenant, each with their permissions — single batched query.
   */
  async listRolesWithPermissions() {
    return this.tenantService.query((tx) => this.repo.listRolesWithPermissions(tx))
  }

  /**
   * Seed default roles for a newly created organization.
   * Called on org creation event.
   */
  async seedDefaultRoles(organizationId: string) {
    await this.tenantService.queryAs(organizationId, async (tx) => {
      await this.repo.seedDefaultRoles(
        organizationId,
        DEFAULT_ROLES.map((def) => ({
          name: def.name,
          slug: def.slug,
          description: def.description,
          permissions: def.permissions,
        })),
        tx
      )
    })
  }
}
