import { describe, expect, it, vi } from 'vitest'
import type { MembershipRepository } from '../membership/membership.repository.js'
import { AccountNotDeletedException } from './exceptions/accountNotDeleted.exception.js'
import { EmailConfirmationMismatchException } from './exceptions/emailConfirmationMismatch.exception.js'
import { TransferTargetNotMemberException } from './exceptions/transferTargetNotMember.exception.js'
import { UserNotFoundException } from './exceptions/userNotFound.exception.js'
import type { UserRepository } from './user.repository.js'
import { UserService } from './user.service.js'
import type { UserPurgeService } from './userPurge.service.js'

const mockEventEmitter = {
  emitAsync: vi.fn().mockResolvedValue([]),
}

function createMockMembershipRepo(): MembershipRepository {
  return {
    getOwnedOrganizations: vi.fn(),
    verifyOrgOwnership: vi.fn(),
    verifyTargetMember: vi.fn(),
    transferOrgOwnership: vi.fn(),
    softDeleteOrg: vi.fn(),
    clearOrgSessions: vi.fn(),
    expireOrgInvitations: vi.fn(),
    deleteUserSessions: vi.fn(),
    transaction: vi.fn(),
  } as unknown as MembershipRepository
}

function createMockUserPurgeService(overrides?: Partial<Record<keyof UserPurgeService, unknown>>) {
  return {
    validatePurgeEligibility: vi.fn(),
    anonymizeUserRecords: vi.fn().mockResolvedValue(undefined),
    purgeOwnedOrganizations: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as UserPurgeService
}

const mockUser = {
  id: 'user-1',
  fullName: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
  fullNameCustomized: false,
  email: 'john@example.com',
  emailVerified: true,
  image: null,
  avatarSeed: null,
  avatarStyle: 'lorelei',
  avatarOptions: null,
  role: 'user',
  deletedAt: null,
  deleteScheduledFor: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

function createMockUserRepo(): UserRepository {
  return {
    getSoftDeleteStatus: vi.fn(),
    getBanStatus: vi.fn(),
    getProfile: vi.fn(),
    getNameFields: vi.fn(),
    updateProfile: vi.fn(),
    findForValidation: vi.fn(),
    softDeleteUser: vi.fn(),
    reactivateUser: vi.fn(),
    transaction: vi.fn(),
  } as unknown as UserRepository
}

describe('UserService', () => {
  describe('getSoftDeleteStatus', () => {
    it('should return deletedAt and deleteScheduledFor when user is soft-deleted', async () => {
      // Arrange
      const deletedAt = new Date('2026-02-01')
      const deleteScheduledFor = new Date('2026-03-03')
      const mockRepo = createMockUserRepo()
      ;(mockRepo.getSoftDeleteStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        deletedAt,
        deleteScheduledFor,
      })
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act
      const result = await service.getSoftDeleteStatus('user-1')

      // Assert
      expect(result).toEqual({ deletedAt, deleteScheduledFor })
    })

    it('should return null fields when user exists and is active', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      ;(mockRepo.getSoftDeleteStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        deletedAt: null,
        deleteScheduledFor: null,
      })
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act -- use unique userId to avoid module-level cache collision with other tests
      const result = await service.getSoftDeleteStatus('user-active')

      // Assert
      expect(mockRepo.getSoftDeleteStatus).toHaveBeenCalledOnce()
      expect(result).toEqual({ deletedAt: null, deleteScheduledFor: null })
    })

    it('should return null when user does not exist', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      ;(mockRepo.getSoftDeleteStatus as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act
      const result = await service.getSoftDeleteStatus('nonexistent')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('getBanStatus', () => {
    it('should return ban status from repository on cache miss', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      ;(mockRepo.getBanStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        banned: true,
        banExpires: null,
      })
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act -- unique userId to avoid cache collisions
      const result = await service.getBanStatus('user-banned-1')

      // Assert
      expect(mockRepo.getBanStatus).toHaveBeenCalledOnce()
      expect(result).toEqual({ banned: true, banExpires: null })
    })

    it('should return cached value and NOT hit repository on cache hit', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      ;(mockRepo.getBanStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        banned: false,
        banExpires: null,
      })
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act -- call twice, should only hit DB once
      await service.getBanStatus('user-banned-2')
      const result = await service.getBanStatus('user-banned-2')

      // Assert
      expect(mockRepo.getBanStatus).toHaveBeenCalledOnce()
      expect(result).toEqual({ banned: false, banExpires: null })
    })

    it('should return null when user does not exist', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      ;(mockRepo.getBanStatus as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act
      const result = await service.getBanStatus('user-banned-nonexistent')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('getProfile', () => {
    it('should return user profile with all new fields', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      ;(mockRepo.getProfile as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act
      const result = await service.getProfile('user-1')

      // Assert
      expect(result).toEqual(mockUser)
      expect(result).toHaveProperty('firstName')
      expect(result).toHaveProperty('lastName')
      expect(result).toHaveProperty('fullNameCustomized')
      expect(result).toHaveProperty('avatarSeed')
      expect(result).toHaveProperty('avatarStyle')
      expect(result).toHaveProperty('deletedAt')
      expect(result).toHaveProperty('deleteScheduledFor')
      expect(result).not.toHaveProperty('banned')
      expect(result).not.toHaveProperty('banReason')
    })

    it('should throw UserNotFoundException when user not found', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      ;(mockRepo.getProfile as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act & Assert
      await expect(service.getProfile('nonexistent')).rejects.toThrow(UserNotFoundException)
    })
  })

  describe('updateProfile', () => {
    it('should update firstName and auto-update fullName when fullNameCustomized is false', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      ;(mockRepo.getNameFields as ReturnType<typeof vi.fn>).mockResolvedValue({
        firstName: 'John',
        lastName: 'Doe',
        fullNameCustomized: false,
      })
      const updatedUser = { ...mockUser, firstName: 'Jane', fullName: 'Jane Doe' }
      ;(mockRepo.updateProfile as ReturnType<typeof vi.fn>).mockResolvedValue(updatedUser)
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act
      const result = await service.updateProfile('user-1', { firstName: 'Jane' })

      // Assert
      expect(result.firstName).toBe('Jane')
      expect(result.fullName).toBe('Jane Doe')
    })

    it('should set fullNameCustomized to true when fullName is directly edited', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      const updatedUser = { ...mockUser, fullName: 'Custom Name', fullNameCustomized: true }
      ;(mockRepo.updateProfile as ReturnType<typeof vi.fn>).mockResolvedValue(updatedUser)
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act
      const result = await service.updateProfile('user-1', { fullName: 'Custom Name' })

      // Assert
      expect(result.fullName).toBe('Custom Name')
      expect(result.fullNameCustomized).toBe(true)
    })

    it('should throw UserNotFoundException when user not found during update', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      ;(mockRepo.updateProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act & Assert
      await expect(service.updateProfile('nonexistent', { fullName: 'Jane' })).rejects.toThrow(
        UserNotFoundException
      )
    })
  })

  describe('softDelete', () => {
    it('should throw EmailConfirmationMismatchException when email does not match', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      ;(mockRepo.findForValidation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-1',
        email: 'john@example.com',
        deletedAt: null,
      })
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act & Assert
      await expect(service.softDelete('user-1', 'wrong@example.com', [])).rejects.toThrow(
        EmailConfirmationMismatchException
      )
    })

    it('should throw UserNotFoundException when user does not exist', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      ;(mockRepo.findForValidation as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act & Assert
      await expect(service.softDelete('nonexistent', 'john@example.com', [])).rejects.toThrow(
        UserNotFoundException
      )
    })

    it('should throw TransferTargetNotMemberException when transfer target is not a member of the org', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      const mockMembershipRepo = createMockMembershipRepo()
      ;(mockRepo.findForValidation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-1',
        email: 'john@example.com',
        deletedAt: null,
      })
      ;(mockMembershipRepo.transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn(undefined)
      )
      ;(mockMembershipRepo.verifyOrgOwnership as ReturnType<typeof vi.fn>).mockResolvedValue({
        role: 'owner',
      })
      ;(mockMembershipRepo.verifyTargetMember as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      )

      const service = new UserService(
        mockRepo as never,
        mockMembershipRepo as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )
      const orgResolutions = [
        { organizationId: 'org-1', action: 'transfer' as const, transferToUserId: 'user-999' },
      ]

      // Act & Assert
      await expect(
        service.softDelete('user-1', 'john@example.com', orgResolutions)
      ).rejects.toThrow(TransferTargetNotMemberException)
    })

    it('should process transfer resolution by updating target member role to owner', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      const mockMembershipRepo = createMockMembershipRepo()
      ;(mockRepo.findForValidation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-1',
        email: 'john@example.com',
        deletedAt: null,
      })
      const deletedUser = {
        ...mockUser,
        deletedAt: new Date(),
        deleteScheduledFor: new Date(),
      }
      ;(mockMembershipRepo.transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn(undefined)
      )
      ;(mockMembershipRepo.verifyOrgOwnership as ReturnType<typeof vi.fn>).mockResolvedValue({
        role: 'owner',
      })
      ;(mockMembershipRepo.verifyTargetMember as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'member-2',
      })
      ;(mockMembershipRepo.transferOrgOwnership as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      )
      ;(mockRepo.softDeleteUser as ReturnType<typeof vi.fn>).mockResolvedValue(deletedUser)
      ;(mockMembershipRepo.deleteUserSessions as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      )

      const service = new UserService(
        mockRepo as never,
        mockMembershipRepo as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )
      const orgResolutions = [
        { organizationId: 'org-1', action: 'transfer' as const, transferToUserId: 'user-2' },
      ]

      // Act
      const result = await service.softDelete('user-1', 'john@example.com', orgResolutions)

      // Assert
      expect(result).toEqual(deletedUser)
      expect(mockMembershipRepo.transaction).toHaveBeenCalledOnce()
      expect(mockMembershipRepo.transferOrgOwnership).toHaveBeenCalledOnce()
    })

    it('should process delete resolution by soft-deleting org, clearing sessions, and expiring invitations', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      const mockMembershipRepo = createMockMembershipRepo()
      ;(mockRepo.findForValidation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-1',
        email: 'john@example.com',
        deletedAt: null,
      })
      const deletedUser = {
        ...mockUser,
        deletedAt: new Date(),
        deleteScheduledFor: new Date(),
      }
      ;(mockMembershipRepo.transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn(undefined)
      )
      ;(mockMembershipRepo.verifyOrgOwnership as ReturnType<typeof vi.fn>).mockResolvedValue({
        role: 'owner',
      })
      ;(mockMembershipRepo.softDeleteOrg as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      ;(mockMembershipRepo.clearOrgSessions as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      )
      ;(mockMembershipRepo.expireOrgInvitations as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      )
      ;(mockRepo.softDeleteUser as ReturnType<typeof vi.fn>).mockResolvedValue(deletedUser)
      ;(mockMembershipRepo.deleteUserSessions as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      )

      const service = new UserService(
        mockRepo as never,
        mockMembershipRepo as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )
      const orgResolutions = [{ organizationId: 'org-1', action: 'delete' as const }]

      // Act
      const result = await service.softDelete('user-1', 'john@example.com', orgResolutions)

      // Assert
      expect(result).toEqual(deletedUser)
      expect(mockMembershipRepo.transaction).toHaveBeenCalledOnce()
      expect(mockMembershipRepo.softDeleteOrg).toHaveBeenCalledOnce()
      expect(mockMembershipRepo.clearOrgSessions).toHaveBeenCalledOnce()
      expect(mockMembershipRepo.expireOrgInvitations).toHaveBeenCalledOnce()
    })

    it('should accept case-insensitive email confirmation', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      const mockMembershipRepo = createMockMembershipRepo()
      ;(mockRepo.findForValidation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-1',
        email: 'John@Example.com',
        deletedAt: null,
      })
      const deletedUser = {
        ...mockUser,
        deletedAt: new Date(),
        deleteScheduledFor: new Date(),
      }
      ;(mockMembershipRepo.transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn(undefined)
      )
      ;(mockRepo.softDeleteUser as ReturnType<typeof vi.fn>).mockResolvedValue(deletedUser)
      ;(mockMembershipRepo.deleteUserSessions as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      )

      const service = new UserService(
        mockRepo as never,
        mockMembershipRepo as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act
      const result = await service.softDelete('user-1', 'john@example.com', [])

      // Assert
      expect(result).toEqual(deletedUser)
    })
  })

  describe('reactivate', () => {
    it('should clear deletedAt and deleteScheduledFor', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      const reactivatedUser = { ...mockUser, deletedAt: null, deleteScheduledFor: null }
      ;(mockRepo.reactivateUser as ReturnType<typeof vi.fn>).mockResolvedValue(reactivatedUser)
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act
      const result = await service.reactivate('user-1')

      // Assert
      expect(result.deletedAt).toBeNull()
      expect(result.deleteScheduledFor).toBeNull()
    })

    it('should throw UserNotFoundException when user not found', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      ;(mockRepo.reactivateUser as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act & Assert
      await expect(service.reactivate('nonexistent')).rejects.toThrow(UserNotFoundException)
    })
  })

  describe('getOwnedOrganizations', () => {
    it('should return organizations where user has owner role', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      const mockMembershipRepo = createMockMembershipRepo()
      const ownedOrgs = [
        { orgId: 'org-1', orgName: 'Org One', orgSlug: 'org-one' },
        { orgId: 'org-2', orgName: 'Org Two', orgSlug: 'org-two' },
      ]
      ;(mockMembershipRepo.getOwnedOrganizations as ReturnType<typeof vi.fn>).mockResolvedValue(
        ownedOrgs
      )
      const service = new UserService(
        mockRepo as never,
        mockMembershipRepo as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act
      const result = await service.getOwnedOrganizations('user-1')

      // Assert
      expect(result).toEqual(ownedOrgs)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when user owns no organizations', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      const mockMembershipRepo = createMockMembershipRepo()
      ;(mockMembershipRepo.getOwnedOrganizations as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const service = new UserService(
        mockRepo as never,
        mockMembershipRepo as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act
      const result = await service.getOwnedOrganizations('user-1')

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('purge', () => {
    it('should propagate UserNotFoundException from UserPurgeService', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      const mockPurgeService = createMockUserPurgeService({
        validatePurgeEligibility: vi
          .fn()
          .mockRejectedValue(new UserNotFoundException('nonexistent')),
      })
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        mockPurgeService
      )

      // Act & Assert
      await expect(service.purge('nonexistent', 'john@example.com')).rejects.toThrow(
        UserNotFoundException
      )
    })

    it('should propagate AccountNotDeletedException from UserPurgeService', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      const mockPurgeService = createMockUserPurgeService({
        validatePurgeEligibility: vi.fn().mockRejectedValue(new AccountNotDeletedException()),
      })
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        mockPurgeService
      )

      // Act & Assert
      await expect(service.purge('user-purge-1', 'john@example.com')).rejects.toThrow(
        AccountNotDeletedException
      )
    })

    it('should propagate EmailConfirmationMismatchException from UserPurgeService', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      const mockPurgeService = createMockUserPurgeService({
        validatePurgeEligibility: vi
          .fn()
          .mockRejectedValue(new EmailConfirmationMismatchException()),
      })
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        mockPurgeService
      )

      // Act & Assert
      await expect(service.purge('user-purge-2', 'wrong@example.com')).rejects.toThrow(
        EmailConfirmationMismatchException
      )
    })

    it('should delegate to UserPurgeService and return success on happy path', async () => {
      // Arrange
      const mockRepo = createMockUserRepo()
      const user = { id: 'user-purge-3', email: 'john@example.com', deletedAt: new Date() }
      const mockPurgeService = createMockUserPurgeService({
        validatePurgeEligibility: vi.fn().mockResolvedValue(user),
      })
      ;(mockRepo.transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn({})
      )
      const service = new UserService(
        mockRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        mockPurgeService
      )

      // Act
      const result = await service.purge('user-purge-3', 'john@example.com')

      // Assert
      expect(result).toEqual({ success: true })
      expect(mockRepo.transaction).toHaveBeenCalledOnce()
      expect(mockPurgeService.validatePurgeEligibility).toHaveBeenCalledWith(
        'user-purge-3',
        'john@example.com'
      )
      expect(mockPurgeService.anonymizeUserRecords).toHaveBeenCalledOnce()
      expect(mockPurgeService.purgeOwnedOrganizations).toHaveBeenCalledOnce()
    })

    it('should invalidate soft-delete cache after purge', async () => {
      // Arrange — prime cache with one service instance, purge with another, verify fresh DB hit
      const user = { id: 'user-purge-7', email: 'john@example.com', deletedAt: new Date() }
      const mockPurgeService = createMockUserPurgeService({
        validatePurgeEligibility: vi.fn().mockResolvedValue(user),
      })

      // Cache service: call getSoftDeleteStatus to prime the cache
      const cacheRepo = createMockUserRepo()
      ;(cacheRepo.getSoftDeleteStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        deletedAt: new Date(),
        deleteScheduledFor: new Date(),
      })
      const cacheService = new UserService(
        cacheRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )
      await cacheService.getSoftDeleteStatus('user-purge-7')

      // Purge service: purge the user to invalidate cache
      const purgeRepo = createMockUserRepo()
      ;(purgeRepo.transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn({})
      )
      const purgeService = new UserService(
        purgeRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        mockPurgeService
      )
      await purgeService.purge('user-purge-7', 'john@example.com')

      // Fresh service: getSoftDeleteStatus should hit DB (not cache)
      const freshRepo = createMockUserRepo()
      ;(freshRepo.getSoftDeleteStatus as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      const freshService = new UserService(
        freshRepo as never,
        createMockMembershipRepo() as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )
      const result = await freshService.getSoftDeleteStatus('user-purge-7')

      // Assert -- cache was invalidated so the fresh DB query returns null (no user)
      expect(result).toBeNull()
      expect(freshRepo.getSoftDeleteStatus).toHaveBeenCalled()
    })
  })
})
