import { Inject, Injectable } from '@nestjs/common'
import { and, count, eq } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import { whereActive } from '../../database/helpers/whereActive.js'
import { invitations, members, organizations, sessions } from '../../database/schema/auth.schema.js'
import { roles } from '../../database/schema/rbac.schema.js'
import type {
  OrgDeletionImpact,
  OrgFindRow,
  OrgListRow,
  OrgOwnershipRow,
  OrgRepository,
  OrgSoftDeleteRow,
} from '../org.repository.js'

@Injectable()
export class DrizzleOrgRepository implements OrgRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listForUser(userId: string, tx?: DrizzleTx): Promise<OrgListRow[]> {
    const qb = tx ?? this.db
    return qb
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        createdAt: organizations.createdAt,
      })
      .from(members)
      .innerJoin(organizations, eq(members.organizationId, organizations.id))
      .where(and(eq(members.userId, userId), whereActive(organizations)))
      .orderBy(organizations.name)
  }

  async findActiveOrg(orgId: string, tx?: DrizzleTx): Promise<OrgFindRow | undefined> {
    const qb = tx ?? this.db
    const [org] = await qb
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(and(eq(organizations.id, orgId), whereActive(organizations)))
      .limit(1)
    return org
  }

  async findOrgForReactivate(
    orgId: string,
    tx?: DrizzleTx
  ): Promise<{ id: string; deletedAt: Date | null } | undefined> {
    const qb = tx ?? this.db
    const [org] = await qb
      .select({ id: organizations.id, deletedAt: organizations.deletedAt })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)
    return org
  }

  async checkOwnership(
    orgId: string,
    userId: string,
    tx?: DrizzleTx
  ): Promise<OrgOwnershipRow | undefined> {
    const qb = tx ?? this.db
    const [membership] = await qb
      .select({ role: members.role })
      .from(members)
      .where(and(eq(members.organizationId, orgId), eq(members.userId, userId)))
      .limit(1)
    return membership
  }

  async softDeleteOrg(
    orgId: string,
    now: Date,
    deleteScheduledFor: Date,
    tx?: DrizzleTx
  ): Promise<OrgSoftDeleteRow | undefined> {
    const qb = tx ?? this.db
    const [result] = await qb
      .update(organizations)
      .set({ deletedAt: now, deleteScheduledFor, updatedAt: now })
      .where(eq(organizations.id, orgId))
      .returning({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        deletedAt: organizations.deletedAt,
        deleteScheduledFor: organizations.deleteScheduledFor,
      })
    return result
  }

  async clearOrgSessions(orgId: string, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb
      .update(sessions)
      .set({ activeOrganizationId: null })
      .where(eq(sessions.activeOrganizationId, orgId))
  }

  async expireOrgInvitations(orgId: string, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb
      .update(invitations)
      .set({ status: 'expired' })
      .where(and(eq(invitations.organizationId, orgId), eq(invitations.status, 'pending')))
  }

  async reactivateOrg(
    orgId: string,
    now: Date,
    tx?: DrizzleTx
  ): Promise<OrgSoftDeleteRow | undefined> {
    const qb = tx ?? this.db
    const [updated] = await qb
      .update(organizations)
      .set({ deletedAt: null, deleteScheduledFor: null, updatedAt: now })
      .where(eq(organizations.id, orgId))
      .returning({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        deletedAt: organizations.deletedAt,
        deleteScheduledFor: organizations.deleteScheduledFor,
      })
    return updated
  }

  async getDeletionImpact(orgId: string, tx?: DrizzleTx): Promise<OrgDeletionImpact> {
    const qb = tx ?? this.db

    // Count members
    const [memberResult] = await qb
      .select({ count: count() })
      .from(members)
      .where(eq(members.organizationId, orgId))

    // Count pending invitations
    const [invitationResult] = await qb
      .select({ count: count() })
      .from(invitations)
      .where(and(eq(invitations.organizationId, orgId), eq(invitations.status, 'pending')))

    // Count custom roles (non-default, tenant-scoped)
    const [roleResult] = await qb
      .select({ count: count() })
      .from(roles)
      .where(and(eq(roles.tenantId, orgId), eq(roles.isDefault, false)))

    return {
      memberCount: memberResult?.count ?? 0,
      invitationCount: invitationResult?.count ?? 0,
      customRoleCount: roleResult?.count ?? 0,
    }
  }

  transaction<T>(fn: (tx: DrizzleTx) => Promise<T>): Promise<T> {
    return this.db.transaction(fn)
  }
}
