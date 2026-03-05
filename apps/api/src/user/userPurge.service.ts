import { Inject, Injectable } from '@nestjs/common'
import { and, eq, isNotNull } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../database/drizzle.provider.js'
import {
  accounts,
  invitations,
  members,
  organizations,
  sessions,
  users,
  verifications,
} from '../database/schema/auth.schema.js'
import { roles } from '../database/schema/rbac.schema.js'
import { AccountNotDeletedException } from './exceptions/accountNotDeleted.exception.js'
import { EmailConfirmationMismatchException } from './exceptions/emailConfirmationMismatch.exception.js'
import { UserNotFoundException } from './exceptions/userNotFound.exception.js'

/**
 * UserPurgeService -- purge-specific operations extracted from UserService.
 *
 * Handles: validatePurgeEligibility, anonymizeUserRecords, purgeOwnedOrganizations.
 *
 * Called by UserService.purge() (user-initiated) and PurgeService (cron-based).
 */
@Injectable()
export class UserPurgeService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async validatePurgeEligibility(userId: string, confirmEmail: string) {
    const [user] = await this.db
      .select({ id: users.id, email: users.email, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!user) throw new UserNotFoundException(userId)

    // Only soft-deleted users can purge. The grace period is intentionally
    // bypassed for user-initiated purge -- the user explicitly requested
    // immediate deletion from the reactivation page.
    if (!user.deletedAt) {
      throw new AccountNotDeletedException()
    }

    if (user.email.toLowerCase() !== confirmEmail.toLowerCase()) {
      throw new EmailConfirmationMismatchException()
    }

    return user
  }

  /** Used by PurgeService (purge/) for cron-based anonymization. */
  async anonymizeUserRecords(tx: DrizzleTx, userId: string, originalEmail: string, now: Date) {
    const anonymizedEmail = `deleted-${crypto.randomUUID()}@anonymized.local`

    // Anonymize user record
    await tx
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
    await tx.delete(sessions).where(eq(sessions.userId, userId))
    await tx.delete(accounts).where(eq(accounts.userId, userId))
    await tx.delete(verifications).where(eq(verifications.identifier, originalEmail))
    await tx.delete(invitations).where(eq(invitations.inviterId, userId))
    await tx.delete(invitations).where(eq(invitations.email, originalEmail))
  }

  async purgeOwnedOrganizations(tx: DrizzleTx, userId: string, now: Date) {
    const ownedDeletedOrgs = await tx
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

    // TODO: Optimize with inArray() batch operations instead of sequential loop.
    // Blocked because each org needs a unique anonymized slug (crypto.randomUUID()),
    // which requires per-row UPDATE. Consider a SQL-level random slug generation
    // or a two-pass approach (batch delete members/invitations/roles, then loop for slugs).
    for (const { orgId } of ownedDeletedOrgs) {
      const anonymizedSlug = `deleted-${crypto.randomUUID()}`

      await tx
        .update(organizations)
        .set({
          name: 'Deleted Organization',
          slug: anonymizedSlug,
          logo: null,
          metadata: null,
          updatedAt: now,
        })
        .where(eq(organizations.id, orgId))

      await tx.delete(members).where(eq(members.organizationId, orgId))
      await tx.delete(invitations).where(eq(invitations.organizationId, orgId))
      await tx.delete(roles).where(eq(roles.tenantId, orgId))
    }

    // Remove user's membership from all remaining organizations
    await tx.delete(members).where(eq(members.userId, userId))
  }
}
