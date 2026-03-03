import { Inject, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { OrgOwnershipResolution } from '@repo/types'
import { and, eq, isNotNull } from 'drizzle-orm'
import { DELETION_GRACE_PERIOD_MS } from '../common/constants.js'
import { USER_SOFT_DELETED, UserSoftDeletedEvent } from '../common/events/userSoftDeleted.event.js'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../database/drizzle.provider.js'
import { whereActive } from '../database/helpers/whereActive.js'
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
import { OrgNotOwnerException } from '../organization/exceptions/orgNotOwner.exception.js'
import { AccountAlreadyDeletedException } from './exceptions/accountAlreadyDeleted.exception.js'
import { AccountNotDeletedException } from './exceptions/accountNotDeleted.exception.js'
import { EmailConfirmationMismatchException } from './exceptions/emailConfirmationMismatch.exception.js'
import { TransferTargetNotMemberException } from './exceptions/transferTargetNotMember.exception.js'
import { UserNotFoundException } from './exceptions/userNotFound.exception.js'

const profileColumns = {
  id: users.id,
  fullName: users.name,
  firstName: users.firstName,
  lastName: users.lastName,
  fullNameCustomized: users.fullNameCustomized,
  email: users.email,
  emailVerified: users.emailVerified,
  image: users.image,
  avatarSeed: users.avatarSeed,
  avatarStyle: users.avatarStyle,
  avatarOptions: users.avatarOptions,
  role: users.role,
  deletedAt: users.deletedAt,
  deleteScheduledFor: users.deleteScheduledFor,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
}

/** Simple in-memory TTL cache for soft-delete status lookups */
const SOFT_DELETE_CACHE_TTL_MS = 60_000

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name)
  private readonly softDeleteCache = new Map<
    string,
    { value: { deletedAt: Date | null; deleteScheduledFor: Date | null } | null; expiresAt: number }
  >()

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async getSoftDeleteStatus(userId: string) {
    const cached = this.softDeleteCache.get(userId)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value
    }

    const [user] = await this.db
      .select({ deletedAt: users.deletedAt, deleteScheduledFor: users.deleteScheduledFor })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    const result = user ?? null
    this.softDeleteCache.set(userId, {
      value: result,
      expiresAt: Date.now() + SOFT_DELETE_CACHE_TTL_MS,
    })
    return result
  }

  /** Invalidate the soft-delete status cache for a user */
  private invalidateSoftDeleteCache(userId: string) {
    this.softDeleteCache.delete(userId)
  }

  async getProfile(userId: string) {
    // whereActive is intentionally omitted: the AuthGuard blocks soft-deleted users
    // from most endpoints, and the profile page needs to display deletion status
    // (deletedAt, deleteScheduledFor) so users can see and reactivate their account.
    const [user] = await this.db
      .select(profileColumns)
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!user) throw new UserNotFoundException(userId)
    return user
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherent to multi-field optional profile update logic
  async updateProfile(
    userId: string,
    data: {
      firstName?: string
      lastName?: string
      fullName?: string
      avatarSeed?: string | null
      avatarStyle?: string | null
      avatarOptions?: Record<string, unknown>
      image?: string | null
    }
  ) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.avatarSeed !== undefined) updateData.avatarSeed = data.avatarSeed
    if (data.avatarStyle !== undefined) updateData.avatarStyle = data.avatarStyle
    if (data.avatarOptions !== undefined) updateData.avatarOptions = data.avatarOptions
    if (data.image !== undefined) updateData.image = data.image

    // If fullName is directly edited, set fullNameCustomized = true
    if (data.fullName !== undefined) {
      updateData.name = data.fullName
      updateData.fullNameCustomized = true
    }

    if (data.firstName !== undefined) updateData.firstName = data.firstName
    if (data.lastName !== undefined) updateData.lastName = data.lastName

    // If firstName or lastName changed and fullName was NOT directly edited,
    // auto-update name from first + last (only if fullNameCustomized is false)
    if (
      (data.firstName !== undefined || data.lastName !== undefined) &&
      data.fullName === undefined
    ) {
      const [current] = await this.db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          fullNameCustomized: users.fullNameCustomized,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      if (!current) throw new UserNotFoundException(userId)

      if (!current.fullNameCustomized) {
        const newFirst = data.firstName ?? current.firstName
        const newLast = data.lastName ?? current.lastName
        updateData.name = `${newFirst} ${newLast}`.trim()
      }
    }

    const [updated] = await this.db
      .update(users)
      .set(updateData)
      .where(and(eq(users.id, userId), whereActive(users)))
      .returning(profileColumns)
    if (!updated) throw new UserNotFoundException(userId)
    return updated
  }

  private async validateSoftDeleteRequest(userId: string, confirmEmail: string) {
    const [user] = await this.db
      .select({ id: users.id, email: users.email, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!user) throw new UserNotFoundException(userId)

    // Block re-deletion: prevent scheduling deletion on an already-deleted account
    if (user.deletedAt) {
      throw new AccountAlreadyDeletedException()
    }

    if (user.email.toLowerCase() !== confirmEmail.toLowerCase()) {
      throw new EmailConfirmationMismatchException()
    }

    return user
  }

  private async processOrgTransfer(
    tx: DrizzleTx,
    resolution: Extract<OrgOwnershipResolution, { action: 'transfer' }>,
    now: Date
  ) {
    // Verify transferToUserId is an existing member of the org
    const [targetMember] = await tx
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.organizationId, resolution.organizationId),
          eq(members.userId, resolution.transferToUserId)
        )
      )
      .limit(1)
    if (!targetMember) {
      throw new TransferTargetNotMemberException(
        resolution.transferToUserId,
        resolution.organizationId
      )
    }

    // Transfer ownership: update role on target member
    await tx
      .update(members)
      .set({ role: 'owner', updatedAt: now })
      .where(
        and(
          eq(members.organizationId, resolution.organizationId),
          eq(members.userId, resolution.transferToUserId)
        )
      )
  }

  private async processOrgDeletion(
    tx: DrizzleTx,
    resolution: Extract<OrgOwnershipResolution, { action: 'delete' }>,
    now: Date,
    deleteScheduledFor: Date
  ) {
    // Soft-delete the organization
    await tx
      .update(organizations)
      .set({ deletedAt: now, deleteScheduledFor, updatedAt: now })
      .where(eq(organizations.id, resolution.organizationId))

    // Clear activeOrganizationId on sessions referencing this org
    await tx
      .update(sessions)
      .set({ activeOrganizationId: null })
      .where(eq(sessions.activeOrganizationId, resolution.organizationId))

    // Invalidate pending invitations for this org
    await tx
      .update(invitations)
      .set({ status: 'expired' })
      .where(
        and(
          eq(invitations.organizationId, resolution.organizationId),
          eq(invitations.status, 'pending')
        )
      )
  }

  private async processOrgResolution(
    tx: DrizzleTx,
    resolution: OrgOwnershipResolution,
    userId: string,
    context: { now: Date; deleteScheduledFor: Date }
  ) {
    // Verify the deleting user is an owner of this organization
    const [membership] = await tx
      .select({ role: members.role })
      .from(members)
      .where(and(eq(members.organizationId, resolution.organizationId), eq(members.userId, userId)))
      .limit(1)
    if (!membership || membership.role !== 'owner') {
      throw new OrgNotOwnerException(resolution.organizationId)
    }

    if (resolution.action === 'transfer') {
      await this.processOrgTransfer(tx, resolution, context.now)
    } else if (resolution.action === 'delete') {
      await this.processOrgDeletion(tx, resolution, context.now, context.deleteScheduledFor)
    }
  }

  async softDelete(userId: string, confirmEmail: string, orgResolutions: OrgOwnershipResolution[]) {
    await this.validateSoftDeleteRequest(userId, confirmEmail)

    const now = new Date()
    const deleteScheduledFor = new Date(now.getTime() + DELETION_GRACE_PERIOD_MS)

    const updated = await this.db.transaction(async (tx) => {
      for (const resolution of orgResolutions) {
        await this.processOrgResolution(tx, resolution, userId, { now, deleteScheduledFor })
      }

      // Soft-delete the user
      const [result] = await tx
        .update(users)
        .set({ deletedAt: now, deleteScheduledFor, updatedAt: now })
        .where(eq(users.id, userId))
        .returning(profileColumns)

      // Delete all sessions for this user (force logout)
      await tx.delete(sessions).where(eq(sessions.userId, userId))

      // Invalidate cached soft-delete status after successful deletion
      this.invalidateSoftDeleteCache(userId)

      return result
    })

    // Emit after transaction commits to prevent listeners from running on partial state
    await this.eventEmitter.emitAsync(USER_SOFT_DELETED, new UserSoftDeletedEvent(userId))

    return updated
  }

  async reactivate(userId: string) {
    const [updated] = await this.db
      .update(users)
      .set({ deletedAt: null, deleteScheduledFor: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning(profileColumns)
    if (!updated) throw new UserNotFoundException(userId)

    // Invalidate cached soft-delete status after reactivation
    this.invalidateSoftDeleteCache(userId)

    return updated
  }

  async getOwnedOrganizations(userId: string) {
    const ownedOrgs = await this.db
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        orgSlug: organizations.slug,
      })
      .from(members)
      .innerJoin(organizations, eq(members.organizationId, organizations.id))
      .where(and(eq(members.userId, userId), eq(members.role, 'owner'), whereActive(organizations)))

    return ownedOrgs
  }

  private async validatePurgeEligibility(userId: string, confirmEmail: string) {
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

  /** @internal Used by PurgeService for cron-based anonymization delegation. */
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

  private async purgeOwnedOrganizations(tx: DrizzleTx, userId: string, now: Date) {
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

  async purge(userId: string, confirmEmail: string) {
    const user = await this.validatePurgeEligibility(userId, confirmEmail)
    const originalEmail = user.email

    this.logger.warn('Purging account', { userId })

    await this.db.transaction(async (tx) => {
      const now = new Date()
      await this.anonymizeUserRecords(tx, userId, originalEmail, now)
      await this.purgeOwnedOrganizations(tx, userId, now)
    })

    this.logger.log('Account purged successfully', { userId })

    // Invalidate soft-delete cache after purge
    this.invalidateSoftDeleteCache(userId)

    return { success: true }
  }
}
