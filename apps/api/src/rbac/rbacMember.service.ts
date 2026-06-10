import { Inject, Injectable } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'
import { TenantService } from '../tenant/tenant.service.js'
import { MemberNotFoundException } from './exceptions/memberNotFound.exception.js'
import { OwnershipConstraintException } from './exceptions/ownershipConstraint.exception.js'
import { RoleNotFoundException } from './exceptions/roleNotFound.exception.js'
import { RBAC_MEMBER_REPO, type RbacMemberRepository } from './rbacMember.repository.js'

/**
 * RbacMemberService — member-scoped role operations.
 *
 * Handles: transferOwnership, changeMemberRole.
 *
 * Operates within the current tenant context via TenantService.
 */
@Injectable()
export class RbacMemberService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly cls: ClsService,
    @Inject(RBAC_MEMBER_REPO) private readonly repo: RbacMemberRepository
  ) {}

  /**
   * Transfer ownership from the current Owner to another Admin within the tenant.
   */
  async transferOwnership(currentUserId: string, targetMemberId: string) {
    const tenantId = this.cls.get('tenantId') as string

    return this.tenantService.query(async (tx) => {
      const defaultRoles = await this.repo.findDefaultRoles(tenantId, tx)
      const ownerRole = defaultRoles.find((r) => r.slug === 'owner')
      const adminRole = defaultRoles.find((r) => r.slug === 'admin')

      if (!(ownerRole && adminRole)) {
        throw new OwnershipConstraintException('Default roles not found')
      }

      const currentMember = await this.repo.findMemberByUserAndOrg(
        currentUserId,
        tenantId,
        ownerRole.id,
        tx
      )
      if (!currentMember) {
        throw new OwnershipConstraintException('Only the Owner can transfer ownership')
      }

      const targetMember = await this.repo.findMemberByIdAndOrg(
        targetMemberId,
        tenantId,
        adminRole.id,
        tx
      )
      if (!targetMember) {
        throw new OwnershipConstraintException('Target must be an Admin in the same organization')
      }

      await this.repo.updateMemberRole(currentMember.id, adminRole.id, tx)
      await this.repo.updateMemberRole(targetMember.id, ownerRole.id, tx)

      return { transferred: true }
    })
  }

  /**
   * Change a member's role within the organization.
   */
  async changeMemberRole(memberId: string, roleId: string) {
    const tenantId = this.cls.get('tenantId') as string

    return this.tenantService.query(async (tx) => {
      // Verify role exists in tenant
      const role = await this.repo.findRoleInTenant(roleId, tenantId, tx)

      if (!role) {
        throw new RoleNotFoundException(roleId)
      }

      // Get the member being changed
      const member = await this.repo.findMemberInOrg(memberId, tenantId, tx)

      if (!member) {
        throw new MemberNotFoundException(memberId)
      }

      // Guard owner role assignment and removal
      if (member.roleId) {
        const currentRole = await this.repo.findRoleById(member.roleId, tx)

        if (role.slug === 'owner' && currentRole?.slug !== 'owner') {
          throw new OwnershipConstraintException(
            'Cannot assign owner role directly — use transferOwnership'
          )
        }

        if (currentRole?.slug === 'owner' && role.slug !== 'owner') {
          // Count Owners
          const ownerCount = await this.repo.countMembersWithRole(tenantId, currentRole.id, tx)

          if (ownerCount <= 1) {
            throw new OwnershipConstraintException(
              'Cannot remove the last Owner — transfer ownership first'
            )
          }
        }
      }

      await this.repo.updateMemberRole(memberId, roleId, tx)

      return { updated: true }
    })
  }
}
