import { Inject, Injectable, Logger } from '@nestjs/common'
import { and, count, eq, ilike, or } from 'drizzle-orm'
import { ClsService } from 'nestjs-cls'
import { AuditService } from '../audit/audit.service.js'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../database/drizzle.provider.js'
import { members, users } from '../database/schema/auth.schema.js'
import { roles } from '../database/schema/rbac.schema.js'
import { LastOwnerConstraintException } from './exceptions/lastOwnerConstraint.exception.js'
import { AdminMemberNotFoundException } from './exceptions/memberNotFound.exception.js'
import { AdminRoleNotFoundException } from './exceptions/roleNotFound.exception.js'
import { SelfRemovalException } from './exceptions/selfRemoval.exception.js'
import { SelfRoleChangeException } from './exceptions/selfRoleChange.exception.js'
import { escapeIlikePattern } from './utils/escapeIlikePattern.js'

/**
 * AdminMembersService intentionally uses the raw DRIZZLE connection (not TenantService)
 * because admin operations require organization-scoped access that is explicitly filtered
 * by organizationId in every query. The active organization is derived from the user's
 * session (session.activeOrganizationId), not from RLS policies.
 *
 * WARNING: The raw DRIZZLE connection bypasses all RLS policies. Any new queries added
 * to this service MUST include explicit WHERE clauses filtering by organizationId.
 * Changes to this file should be flagged in code review.
 *
 * NOTE: Invitation-related methods (inviteMember, listPendingInvitations, revokeInvitation)
 * have been extracted to AdminInvitationsService (admin-invitations.service.ts).
 */
@Injectable()
export class AdminMembersService {
  private readonly logger = new Logger(AdminMembersService.name)

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly auditService: AuditService,
    private readonly cls: ClsService
  ) {}

  /**
   * List members for an organization with offset-based pagination.
   * Joins members -> users -> roles to return full details.
   * Supports optional server-side search by user name or email (ILIKE).
   */
  async listMembers(orgId: string, options: { page: number; limit: number; search?: string }) {
    const offset = (options.page - 1) * options.limit
    const whereClause = this.buildMemberSearchClause(orgId, options.search)

    const [memberRows, totalResult] = await Promise.all([
      this.queryMemberRows(whereClause, options.limit, offset),
      this.queryMemberCount(whereClause),
    ])

    const total = totalResult[0]?.count ?? 0

    return {
      data: memberRows.map((row) => this.formatMemberRow(row)),
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
      },
    }
  }

  private buildMemberSearchClause(orgId: string, search?: string) {
    const conditions = [eq(members.organizationId, orgId)]
    if (search) {
      const pattern = `%${escapeIlikePattern(search)}%`
      const searchCondition = or(ilike(users.name, pattern), ilike(users.email, pattern))
      if (searchCondition) conditions.push(searchCondition)
    }
    return and(...conditions)
  }

  private queryMemberRows(whereClause: ReturnType<typeof and>, limit: number, offset: number) {
    return this.db
      .select({
        id: members.id,
        userId: members.userId,
        role: members.role,
        roleId: members.roleId,
        createdAt: members.createdAt,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
        roleName: roles.name,
        roleSlug: roles.slug,
      })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .leftJoin(roles, eq(members.roleId, roles.id))
      .where(whereClause)
      .orderBy(users.name)
      .limit(limit)
      .offset(offset)
  }

  private queryMemberCount(whereClause: ReturnType<typeof and>) {
    return this.db
      .select({ count: count() })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(whereClause)
  }

  private formatMemberRow(row: {
    id: string
    userId: string
    role: string
    roleId: string | null
    createdAt: Date
    userName: string | null
    userEmail: string
    userImage: string | null
    roleName: string | null
    roleSlug: string | null
  }) {
    return {
      id: row.id,
      userId: row.userId,
      role: row.role,
      roleId: row.roleId,
      createdAt: row.createdAt,
      user: {
        name: row.userName,
        email: row.userEmail,
        image: row.userImage,
      },
      roleDetails: row.roleName ? { name: row.roleName, slug: row.roleSlug } : null,
    }
  }

  /**
   * Change a member's role within the organization.
   * Updates both the roleId FK and the legacy `role` text field.
   */
  async changeMemberRole(
    memberId: string,
    orgId: string,
    data: { roleId: string },
    actorId: string
  ) {
    const newRole = await this.findRoleWithNameOrThrow(orgId, data.roleId)
    const memberWithRole = await this.findMemberWithRole(memberId, orgId)

    if (memberWithRole.userId === actorId) {
      throw new SelfRoleChangeException()
    }

    if (memberWithRole.roleId === data.roleId) {
      return { updated: true }
    }

    // Last-owner guard (#313): prevent demoting the last owner.
    // Wrapped in a transaction to prevent TOCTOU race -- the owner count check
    // and the role update execute atomically within the same transaction.
    await this.db.transaction(async (tx) => {
      await this.ensureNotLastOwnerOnRoleChange(
        tx,
        {
          roleSlug: memberWithRole.currentRoleSlug,
          role: memberWithRole.role,
          roleId: memberWithRole.roleId,
        },
        orgId
      )

      await tx
        .update(members)
        .set({ roleId: data.roleId, role: newRole.slug })
        .where(and(eq(members.id, memberId), eq(members.organizationId, orgId)))
    })

    this.logMemberAudit('member.role_changed', 'member', orgId, memberId, actorId, {
      before: {
        roleId: memberWithRole.roleId,
        roleSlug: memberWithRole.currentRoleSlug ?? null,
        roleName: memberWithRole.currentRoleName ?? null,
      },
      after: {
        roleId: newRole.id,
        roleSlug: newRole.slug,
        roleName: newRole.name,
      },
    })

    return { updated: true }
  }

  private async findRoleWithNameOrThrow(orgId: string, roleId: string) {
    const [role] = await this.db
      .select({ id: roles.id, slug: roles.slug, name: roles.name })
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.tenantId, orgId)))
      .limit(1)

    if (!role) {
      throw new AdminRoleNotFoundException(roleId)
    }
    return role
  }

  private async findMemberWithRole(memberId: string, orgId: string) {
    const [memberWithRole] = await this.db
      .select({
        id: members.id,
        userId: members.userId,
        role: members.role,
        roleId: members.roleId,
        currentRoleSlug: roles.slug,
        currentRoleName: roles.name,
      })
      .from(members)
      .leftJoin(roles, eq(members.roleId, roles.id))
      .where(and(eq(members.id, memberId), eq(members.organizationId, orgId)))
      .limit(1)

    if (!memberWithRole) {
      throw new AdminMemberNotFoundException(memberId)
    }
    return memberWithRole
  }

  /**
   * Remove a member from the organization.
   * Prevents removing the last owner.
   */
  async removeMember(memberId: string, orgId: string, actorId: string) {
    const member = await this.findMemberForRemoval(memberId, orgId)

    if (member.userId === actorId) {
      throw new SelfRemovalException()
    }

    await this.ensureNotLastOwner(member, orgId)

    await this.db.delete(members).where(eq(members.id, memberId))

    this.logMemberAudit('member.removed', 'member', orgId, memberId, actorId, {
      before: {
        userId: member.userId,
        role: member.role,
        roleId: member.roleId,
      },
    })

    return { removed: true }
  }

  private async findMemberForRemoval(memberId: string, orgId: string) {
    const [member] = await this.db
      .select({
        id: members.id,
        userId: members.userId,
        role: members.role,
        roleId: members.roleId,
        roleSlug: roles.slug,
      })
      .from(members)
      .leftJoin(roles, eq(members.roleId, roles.id))
      .where(and(eq(members.id, memberId), eq(members.organizationId, orgId)))
      .limit(1)

    if (!member) {
      throw new AdminMemberNotFoundException(memberId)
    }
    return member
  }

  /**
   * Last-owner guard for role changes (#313).
   * Uses dual-field check matching removeMember pattern:
   * roleSlug === 'owner' || member.role === 'owner'
   *
   * Accepts a transaction handle (`tx`) so the count query runs inside the
   * same transaction as the subsequent role update, preventing TOCTOU races.
   */
  private async ensureNotLastOwnerOnRoleChange(
    tx: DrizzleTx,
    member: { roleSlug: string | null; role: string; roleId: string | null },
    orgId: string
  ) {
    if (member.roleSlug !== 'owner' && member.role !== 'owner') return

    const [ownerCount] = await tx
      .select({ count: count() })
      .from(members)
      // biome-ignore lint/style/noNonNullAssertion: roleId is guaranteed by the owner role check above
      .where(and(eq(members.organizationId, orgId), eq(members.roleId, member.roleId!)))

    if ((ownerCount?.count ?? 0) <= 1) {
      throw new LastOwnerConstraintException()
    }
  }

  private async ensureNotLastOwner(
    member: { roleSlug: string | null; role: string; roleId: string | null },
    orgId: string
  ) {
    if (member.roleSlug !== 'owner' && member.role !== 'owner') return

    const [ownerCount] = await this.db
      .select({ count: count() })
      .from(members)
      // biome-ignore lint/style/noNonNullAssertion: roleId is guaranteed by the owner role check above
      .where(and(eq(members.organizationId, orgId), eq(members.roleId, member.roleId!)))

    if ((ownerCount?.count ?? 0) <= 1) {
      throw new LastOwnerConstraintException()
    }
  }

  private logMemberAudit(
    action: string,
    resource: string,
    orgId: string,
    resourceId: string,
    actorId: string,
    data?: { before?: Record<string, unknown>; after?: Record<string, unknown> }
  ) {
    const payload: Record<string, unknown> = {
      actorId,
      actorType: 'user',
      organizationId: orgId,
      action,
      resource,
      resourceId,
    }
    if (data?.before !== undefined) payload.before = data.before
    if (data?.after !== undefined) payload.after = data.after

    this.auditService.log(payload as Parameters<AuditService['log']>[0]).catch((err) => {
      this.logger.error(`[${this.cls.getId()}][audit] Failed to log ${action}`, err)
    })
  }
}
