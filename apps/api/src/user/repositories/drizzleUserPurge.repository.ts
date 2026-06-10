import { Inject, Injectable } from '@nestjs/common'
import { and, eq, inArray, isNotNull, lte } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import {
  accounts,
  invitations,
  members,
  organizations,
  sessions,
  users,
  verifications,
} from '../../database/schema/auth.schema.js'
import { roles } from '../../database/schema/rbac.schema.js'
import type { UserPurgeRepository } from '../userPurge.repository.js'

@Injectable()
export class DrizzleUserPurgeRepository implements UserPurgeRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findForPurgeValidation(
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ id: string; email: string; deletedAt: Date | null } | null> {
    const qb = tx ?? this.db
    const [user] = await qb
      .select({ id: users.id, email: users.email, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    return user ?? null
  }

  async findExpiredUsers(now: Date, tx?: DrizzleTx): Promise<{ id: string; email: string }[]> {
    const qb = tx ?? this.db
    return qb
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(isNotNull(users.deletedAt), lte(users.deleteScheduledFor, now)))
  }

  async anonymizeUserRecords(
    userId: string,
    originalEmail: string,
    now: Date,
    tx?: DrizzleTx
  ): Promise<void> {
    const qb = tx ?? this.db
    const anonymizedEmail = `deleted-${crypto.randomUUID()}@anonymized.local`

    // Anonymize user record
    await qb
      .update(users)
      .set({
        firstName: 'Deleted',
        lastName: 'User',
        name: 'Deleted User',
        email: anonymizedEmail,
        image: null,
        emailVerified: false,
        avatarSeed: null,
        avatarStyle: null,
        avatarOptions: {},
        updatedAt: now,
      })
      .where(eq(users.id, userId))

    // Delete sessions, accounts, verifications, and invitations
    await qb.delete(sessions).where(eq(sessions.userId, userId))
    await qb.delete(accounts).where(eq(accounts.userId, userId))
    await qb.delete(verifications).where(eq(verifications.identifier, originalEmail))
    await qb.delete(invitations).where(eq(invitations.inviterId, userId))
    await qb.delete(invitations).where(eq(invitations.email, originalEmail))
  }

  async purgeOwnedOrganizations(userId: string, now: Date, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    const ownedDeletedOrgs = await qb
      .select({ orgId: organizations.id })
      .from(members)
      .innerJoin(organizations, eq(members.organizationId, organizations.id))
      .where(
        and(
          eq(members.userId, userId),
          eq(members.role, 'owner'),
          isNotNull(organizations.deletedAt)
        )
      )

    const orgIds = ownedDeletedOrgs.map((o) => o.orgId)

    if (orgIds.length > 0) {
      // Phase 1: parallel per-org updates (unique slug per row prevents inArray batching)
      await Promise.all(
        orgIds.map((orgId) =>
          qb
            .update(organizations)
            .set({
              name: 'Deleted Organization',
              slug: `deleted-${crypto.randomUUID()}`,
              logo: null,
              metadata: null,
              updatedAt: now,
            })
            .where(eq(organizations.id, orgId))
        )
      )

      // Phase 2: batch deletes with inArray
      await qb.delete(members).where(inArray(members.organizationId, orgIds))
      await qb.delete(invitations).where(inArray(invitations.organizationId, orgIds))
      await qb.delete(roles).where(inArray(roles.tenantId, orgIds))
    }

    // Remove user's membership from all remaining organizations
    await qb.delete(members).where(eq(members.userId, userId))
  }
}
