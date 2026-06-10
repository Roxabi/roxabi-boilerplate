import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import { whereActive } from '../../database/helpers/whereActive.js'
import { invitations, members, organizations, sessions } from '../../database/schema/auth.schema.js'
import type { MembershipRepository } from '../membership.repository.js'

@Injectable()
export class DrizzleMembershipRepository implements MembershipRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getOwnedOrganizations(
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ orgId: string; orgName: string; orgSlug: string | null }[]> {
    const qb = tx ?? this.db
    return qb
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        orgSlug: organizations.slug,
      })
      .from(members)
      .innerJoin(organizations, eq(members.organizationId, organizations.id))
      .where(and(eq(members.userId, userId), eq(members.role, 'owner'), whereActive(organizations)))
  }

  async verifyOrgOwnership(
    orgId: string,
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ role: string } | undefined> {
    const qb = tx ?? this.db
    const [membership] = await qb
      .select({ role: members.role })
      .from(members)
      .where(and(eq(members.organizationId, orgId), eq(members.userId, userId)))
      .limit(1)
    return membership
  }

  async verifyTargetMember(
    orgId: string,
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ id: string } | undefined> {
    const qb = tx ?? this.db
    const [targetMember] = await qb
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.organizationId, orgId), eq(members.userId, userId)))
      .limit(1)
    return targetMember
  }

  async transferOrgOwnership(
    orgId: string,
    targetUserId: string,
    now: Date,
    tx?: DrizzleTx
  ): Promise<void> {
    const qb = tx ?? this.db
    await qb
      .update(members)
      .set({ role: 'owner', updatedAt: now })
      .where(and(eq(members.organizationId, orgId), eq(members.userId, targetUserId)))
  }

  async softDeleteOrg(
    orgId: string,
    now: Date,
    deleteScheduledFor: Date,
    tx?: DrizzleTx
  ): Promise<void> {
    const qb = tx ?? this.db
    await qb
      .update(organizations)
      .set({ deletedAt: now, deleteScheduledFor, updatedAt: now })
      .where(eq(organizations.id, orgId))
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

  async deleteUserSessions(userId: string, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb.delete(sessions).where(eq(sessions.userId, userId))
  }

  transaction<T>(fn: (tx: DrizzleTx) => Promise<T>): Promise<T> {
    return this.db.transaction(fn)
  }
}
