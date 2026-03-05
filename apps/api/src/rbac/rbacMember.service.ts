import { Injectable, Logger } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { ClsService } from 'nestjs-cls'
import type { DrizzleTx } from '../database/drizzle.provider.js'
import { members } from '../database/schema/auth.schema.js'
import { roles } from '../database/schema/rbac.schema.js'
import { TenantService } from '../tenant/tenant.service.js'
import { MemberNotFoundException } from './exceptions/memberNotFound.exception.js'
import { OwnershipConstraintException } from './exceptions/ownershipConstraint.exception.js'
import { RoleNotFoundException } from './exceptions/roleNotFound.exception.js'

/**
 * RbacMemberService — member-scoped role operations.
 *
 * Handles: transferOwnership, changeMemberRole.
 *
 * Operates within the current tenant context via TenantService.
 */
@Injectable()
export class RbacMemberService {
  private readonly logger = new Logger(RbacMemberService.name)

  constructor(
    private readonly tenantService: TenantService,
    private readonly cls: ClsService
  ) {}

  /**
   * Transfer ownership from the current Owner to another Admin within the tenant.
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
}
