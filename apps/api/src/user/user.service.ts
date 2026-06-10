import { Inject, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { OrgOwnershipResolution } from '@repo/types'
import { DELETION_GRACE_PERIOD_MS } from '../common/constants.js'
import { USER_SOFT_DELETED, UserSoftDeletedEvent } from '../common/events/userSoftDeleted.event.js'
import { MEMBERSHIP_REPO, type MembershipRepository } from '../membership/membership.repository.js'
import { OrgNotOwnerException } from '../organization/exceptions/orgNotOwner.exception.js'
import { AccountAlreadyDeletedException } from './exceptions/accountAlreadyDeleted.exception.js'
import { EmailConfirmationMismatchException } from './exceptions/emailConfirmationMismatch.exception.js'
import { TransferTargetNotMemberException } from './exceptions/transferTargetNotMember.exception.js'
import { UserNotFoundException } from './exceptions/userNotFound.exception.js'
import { USER_REPO, type UserRepository } from './user.repository.js'
import { UserPurgeService } from './userPurge.service.js'

/** Simple in-memory TTL cache for soft-delete status lookups */
const SOFT_DELETE_CACHE_TTL_MS = 60_000

/** Simple in-memory TTL cache for ban status lookups */
const BAN_CACHE_TTL_MS = 60_000

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name)
  private readonly softDeleteCache = new Map<
    string,
    { value: { deletedAt: Date | null; deleteScheduledFor: Date | null } | null; expiresAt: number }
  >()
  private readonly banCache = new Map<
    string,
    { value: { banned: boolean | null; banExpires: Date | null } | null; expiresAt: number }
  >()

  constructor(
    @Inject(USER_REPO) private readonly repo: UserRepository,
    @Inject(MEMBERSHIP_REPO) private readonly membershipRepo: MembershipRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly userPurgeService: UserPurgeService
  ) {}

  async getSoftDeleteStatus(userId: string) {
    const cached = this.softDeleteCache.get(userId)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value
    }

    const result = await this.repo.getSoftDeleteStatus(userId)
    this.softDeleteCache.set(userId, {
      value: result,
      expiresAt: Date.now() + SOFT_DELETE_CACHE_TTL_MS,
    })
    return result
  }

  async getBanStatus(userId: string) {
    const cached = this.banCache.get(userId)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value
    }

    const result = await this.repo.getBanStatus(userId)
    this.banCache.set(userId, {
      value: result,
      expiresAt: Date.now() + BAN_CACHE_TTL_MS,
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
    const user = await this.repo.getProfile(userId)
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
      const current = await this.repo.getNameFields(userId)
      if (!current) throw new UserNotFoundException(userId)

      if (!current.fullNameCustomized) {
        const newFirst = data.firstName ?? current.firstName
        const newLast = data.lastName ?? current.lastName
        updateData.name = `${newFirst} ${newLast}`.trim()
      }
    }

    const updated = await this.repo.updateProfile(userId, updateData)
    if (!updated) throw new UserNotFoundException(userId)
    return updated
  }

  private async validateSoftDeleteRequest(userId: string, confirmEmail: string) {
    const user = await this.repo.findForValidation(userId)
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

  async softDelete(userId: string, confirmEmail: string, orgResolutions: OrgOwnershipResolution[]) {
    await this.validateSoftDeleteRequest(userId, confirmEmail)

    const now = new Date()
    const deleteScheduledFor = new Date(now.getTime() + DELETION_GRACE_PERIOD_MS)

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherent to multi-table org resolution within softDelete transaction
    const updated = await this.membershipRepo.transaction(async (tx) => {
      for (const resolution of orgResolutions) {
        // Verify the deleting user is an owner of this organization
        const membership = await this.membershipRepo.verifyOrgOwnership(
          resolution.organizationId,
          userId,
          tx
        )
        if (!membership || membership.role !== 'owner') {
          throw new OrgNotOwnerException(resolution.organizationId)
        }

        if (resolution.action === 'transfer') {
          // Verify transferToUserId is an existing member of the org
          const targetMember = await this.membershipRepo.verifyTargetMember(
            resolution.organizationId,
            resolution.transferToUserId,
            tx
          )
          if (!targetMember) {
            throw new TransferTargetNotMemberException(
              resolution.transferToUserId,
              resolution.organizationId
            )
          }
          await this.membershipRepo.transferOrgOwnership(
            resolution.organizationId,
            resolution.transferToUserId,
            now,
            tx
          )
        } else if (resolution.action === 'delete') {
          await this.membershipRepo.softDeleteOrg(
            resolution.organizationId,
            now,
            deleteScheduledFor,
            tx
          )
          await this.membershipRepo.clearOrgSessions(resolution.organizationId, tx)
          await this.membershipRepo.expireOrgInvitations(resolution.organizationId, tx)
        }
      }

      // Soft-delete the user
      const result = await this.repo.softDeleteUser(userId, now, deleteScheduledFor, tx)

      // Delete all sessions for this user (force logout)
      await this.membershipRepo.deleteUserSessions(userId, tx)

      return result
    })

    // Invalidate cached soft-delete status after successful transaction commit
    this.invalidateSoftDeleteCache(userId)

    // Emit after transaction commits to prevent listeners from running on partial state
    await this.eventEmitter.emitAsync(USER_SOFT_DELETED, new UserSoftDeletedEvent(userId))

    return updated
  }

  async reactivate(userId: string) {
    const updated = await this.repo.reactivateUser(userId)
    if (!updated) throw new UserNotFoundException(userId)

    // Invalidate cached soft-delete status after reactivation
    this.invalidateSoftDeleteCache(userId)

    return updated
  }

  async getOwnedOrganizations(userId: string) {
    return this.membershipRepo.getOwnedOrganizations(userId)
  }

  async purge(userId: string, confirmEmail: string) {
    const user = await this.userPurgeService.validatePurgeEligibility(userId, confirmEmail)
    const originalEmail = user.email

    this.logger.warn('Purging account', { userId })

    await this.repo.transaction(async (tx) => {
      const now = new Date()
      await this.userPurgeService.anonymizeUserRecords(userId, originalEmail, now, tx)
      await this.userPurgeService.purgeOwnedOrganizations(userId, now, tx)
    })

    this.logger.log('Account purged successfully', { userId })

    // Invalidate soft-delete cache after purge
    this.invalidateSoftDeleteCache(userId)

    return { success: true }
  }
}
