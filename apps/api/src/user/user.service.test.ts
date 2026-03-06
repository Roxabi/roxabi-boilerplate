import { describe, expect, it, vi } from 'vitest'
import { AccountNotDeletedException } from './exceptions/accountNotDeleted.exception.js'
import { EmailConfirmationMismatchException } from './exceptions/emailConfirmationMismatch.exception.js'
import { TransferTargetNotMemberException } from './exceptions/transferTargetNotMember.exception.js'
import { UserNotFoundException } from './exceptions/userNotFound.exception.js'
import { UserService } from './user.service.js'
import { UserPurgeService } from './userPurge.service.js'

const mockEventEmitter = {
  emitAsync: vi.fn().mockResolvedValue([]),
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
  role: 'user',
  deletedAt: null,
  deleteScheduledFor: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

function createMockDb() {
  const limitFn = vi.fn()
  const selectWhereFn = vi.fn().mockReturnValue({ limit: limitFn })
  const fromFn = vi.fn().mockReturnValue({ where: selectWhereFn })
  const selectFn = vi.fn().mockReturnValue({ from: fromFn })

  const returningFn = vi.fn()
  const updateWhereFn = vi.fn().mockReturnValue({ returning: returningFn })
  const setFn = vi.fn().mockReturnValue({ where: updateWhereFn })
  const updateFn = vi.fn().mockReturnValue({ set: setFn })

  const deleteFn = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([]),
  })

  return {
    db: {
      select: selectFn,
      update: updateFn,
      delete: deleteFn,
      transaction: vi.fn(),
    },
    chains: {
      select: { from: fromFn, where: selectWhereFn, limit: limitFn },
      update: { set: setFn, where: updateWhereFn, returning: returningFn },
    },
  }
}

describe('UserService', () => {
  describe('getSoftDeleteStatus', () => {
    it('should return deletedAt and deleteScheduledFor when user is soft-deleted', async () => {
      // Arrange
      const deletedAt = new Date('2026-02-01')
      const deleteScheduledFor = new Date('2026-03-03')
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ deletedAt, deleteScheduledFor }]),
            }),
          }),
        }),
      }
      const service = new UserService(
        db as never,
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
      const limitFn = vi.fn().mockResolvedValue([{ deletedAt: null, deleteScheduledFor: null }])
      const selectFn = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: limitFn,
          }),
        }),
      })
      const db = { select: selectFn }
      const service = new UserService(
        db as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act — use unique userId to avoid module-level cache collision with other tests
      const result = await service.getSoftDeleteStatus('user-active')

      // Assert
      expect(selectFn).toHaveBeenCalledOnce()
      expect(limitFn).toHaveBeenCalledOnce()
      expect(result).toEqual({ deletedAt: null, deleteScheduledFor: null })
    })

    it('should return null when user does not exist', async () => {
      // Arrange
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }
      const service = new UserService(
        db as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )

      // Act
      const result = await service.getSoftDeleteStatus('nonexistent')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('getProfile', () => {
    it('should return user profile with all new fields', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([mockUser])
      const service = new UserService(
        db as never,
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
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([])
      const service = new UserService(
        db as never,
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
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValueOnce([
        { firstName: 'John', lastName: 'Doe', fullNameCustomized: false },
      ])
      const updatedUser = { ...mockUser, firstName: 'Jane', fullName: 'Jane Doe' }
      chains.update.returning.mockResolvedValue([updatedUser])
      const service = new UserService(
        db as never,
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
      const { db, chains } = createMockDb()
      const updatedUser = { ...mockUser, fullName: 'Custom Name', fullNameCustomized: true }
      chains.update.returning.mockResolvedValue([updatedUser])
      const service = new UserService(
        db as never,
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
      const { db, chains } = createMockDb()
      chains.update.returning.mockResolvedValue([])
      const service = new UserService(
        db as never,
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
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([{ id: 'user-1', email: 'john@example.com' }])
      const service = new UserService(
        db as never,
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
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([])
      const service = new UserService(
        db as never,
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
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([{ id: 'user-1', email: 'john@example.com' }])

      db.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const txLimitFn = vi
          .fn()
          .mockResolvedValueOnce([{ role: 'owner' }]) // ownership check passes
          .mockResolvedValueOnce([]) // target member check fails (not a member)
        const txSelectWhereFn = vi.fn().mockReturnValue({ limit: txLimitFn })
        const txFromFn = vi.fn().mockReturnValue({ where: txSelectWhereFn })
        const tx = {
          select: vi.fn().mockReturnValue({ from: txFromFn }),
        }
        return cb(tx)
      })

      const service = new UserService(
        db as never,
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
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([{ id: 'user-1', email: 'john@example.com' }])
      const deletedUser = {
        ...mockUser,
        deletedAt: new Date(),
        deleteScheduledFor: new Date(),
      }

      const txUpdateCalls: unknown[] = []
      db.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const txLimitFn = vi
          .fn()
          .mockResolvedValueOnce([{ role: 'owner' }]) // ownership check
          .mockResolvedValueOnce([{ id: 'member-2' }]) // target member check
        const txSelectWhereFn = vi.fn().mockReturnValue({ limit: txLimitFn })
        const txFromFn = vi.fn().mockReturnValue({ where: txSelectWhereFn })
        const tx = {
          select: vi.fn().mockReturnValue({ from: txFromFn }),
          update: vi.fn().mockImplementation(() => {
            const call = { setArg: null as unknown }
            txUpdateCalls.push(call)
            return {
              set: vi.fn().mockImplementation((data: unknown) => {
                call.setArg = data
                return {
                  where: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([deletedUser]),
                  }),
                }
              }),
            }
          }),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }
        return cb(tx)
      })

      const service = new UserService(
        db as never,
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
      expect(db.transaction).toHaveBeenCalledOnce()
      // First update call should be the ownership transfer
      expect(txUpdateCalls.length).toBeGreaterThanOrEqual(2)
    })

    it('should process delete resolution by soft-deleting org, clearing sessions, and expiring invitations', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([{ id: 'user-1', email: 'john@example.com' }])
      const deletedUser = {
        ...mockUser,
        deletedAt: new Date(),
        deleteScheduledFor: new Date(),
      }

      let txUpdateCallCount = 0
      db.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        txUpdateCallCount = 0
        const txLimitFn = vi.fn().mockResolvedValueOnce([{ role: 'owner' }]) // ownership check
        const txSelectWhereFn = vi.fn().mockReturnValue({ limit: txLimitFn })
        const txFromFn = vi.fn().mockReturnValue({ where: txSelectWhereFn })
        const tx = {
          select: vi.fn().mockReturnValue({ from: txFromFn }),
          update: vi.fn().mockImplementation(() => {
            txUpdateCallCount++
            return {
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([deletedUser]),
                }),
              }),
            }
          }),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }
        return cb(tx)
      })

      const service = new UserService(
        db as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )
      const orgResolutions = [{ organizationId: 'org-1', action: 'delete' as const }]

      // Act
      const result = await service.softDelete('user-1', 'john@example.com', orgResolutions)

      // Assert
      expect(result).toEqual(deletedUser)
      expect(db.transaction).toHaveBeenCalledOnce()
      // delete resolution produces: org update, session update, invitation update, then user update = 4 update calls
      expect(txUpdateCallCount).toBe(4)
    })

    it('should accept case-insensitive email confirmation', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([{ id: 'user-1', email: 'John@Example.com' }])
      const deletedUser = {
        ...mockUser,
        deletedAt: new Date(),
        deleteScheduledFor: new Date(),
      }
      db.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([deletedUser]),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }
        return cb(tx)
      })
      const service = new UserService(
        db as never,
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
      const { db, chains } = createMockDb()
      const reactivatedUser = { ...mockUser, deletedAt: null, deleteScheduledFor: null }
      chains.update.returning.mockResolvedValue([reactivatedUser])
      const service = new UserService(
        db as never,
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
      const { db, chains } = createMockDb()
      chains.update.returning.mockResolvedValue([])
      const service = new UserService(
        db as never,
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
      const { db } = createMockDb()
      const ownedOrgs = [
        { orgId: 'org-1', orgName: 'Org One', orgSlug: 'org-one' },
        { orgId: 'org-2', orgName: 'Org Two', orgSlug: 'org-two' },
      ]
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(ownedOrgs),
          }),
        }),
      })

      const service = new UserService(
        db as never,
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
      const { db } = createMockDb()
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const service = new UserService(
        db as never,
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
      const { db } = createMockDb()
      const mockPurgeService = createMockUserPurgeService({
        validatePurgeEligibility: vi
          .fn()
          .mockRejectedValue(new UserNotFoundException('nonexistent')),
      })
      const service = new UserService(db as never, mockEventEmitter as never, mockPurgeService)

      // Act & Assert
      await expect(service.purge('nonexistent', 'john@example.com')).rejects.toThrow(
        UserNotFoundException
      )
    })

    it('should propagate AccountNotDeletedException from UserPurgeService', async () => {
      // Arrange
      const { db } = createMockDb()
      const mockPurgeService = createMockUserPurgeService({
        validatePurgeEligibility: vi.fn().mockRejectedValue(new AccountNotDeletedException()),
      })
      const service = new UserService(db as never, mockEventEmitter as never, mockPurgeService)

      // Act & Assert
      await expect(service.purge('user-purge-1', 'john@example.com')).rejects.toThrow(
        AccountNotDeletedException
      )
    })

    it('should propagate EmailConfirmationMismatchException from UserPurgeService', async () => {
      // Arrange
      const { db } = createMockDb()
      const mockPurgeService = createMockUserPurgeService({
        validatePurgeEligibility: vi
          .fn()
          .mockRejectedValue(new EmailConfirmationMismatchException()),
      })
      const service = new UserService(db as never, mockEventEmitter as never, mockPurgeService)

      // Act & Assert
      await expect(service.purge('user-purge-2', 'wrong@example.com')).rejects.toThrow(
        EmailConfirmationMismatchException
      )
    })

    it('should delegate to UserPurgeService and return success on happy path', async () => {
      // Arrange
      const { db } = createMockDb()
      const user = { id: 'user-purge-3', email: 'john@example.com', deletedAt: new Date() }
      const mockPurgeService = createMockUserPurgeService({
        validatePurgeEligibility: vi.fn().mockResolvedValue(user),
      })
      db.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb({}))
      const service = new UserService(db as never, mockEventEmitter as never, mockPurgeService)

      // Act
      const result = await service.purge('user-purge-3', 'john@example.com')

      // Assert
      expect(result).toEqual({ success: true })
      expect(db.transaction).toHaveBeenCalledOnce()
      expect(mockPurgeService.validatePurgeEligibility).toHaveBeenCalledWith(
        'user-purge-3',
        'john@example.com'
      )
      expect(mockPurgeService.anonymizeUserRecords).toHaveBeenCalledOnce()
      expect(mockPurgeService.purgeOwnedOrganizations).toHaveBeenCalledOnce()
    })

    it('should invalidate soft-delete cache after purge', async () => {
      // Arrange
      const { db } = createMockDb()
      const user = { id: 'user-purge-7', email: 'john@example.com', deletedAt: new Date() }
      const mockPurgeService = createMockUserPurgeService({
        validatePurgeEligibility: vi.fn().mockResolvedValue(user),
      })
      db.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb({}))
      const service = new UserService(db as never, mockEventEmitter as never, mockPurgeService)

      // Prime the cache by calling getSoftDeleteStatus first
      const cacheDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi
                .fn()
                .mockResolvedValue([{ deletedAt: new Date(), deleteScheduledFor: new Date() }]),
            }),
          }),
        }),
      }
      const cacheService = new UserService(
        cacheDb as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )
      await cacheService.getSoftDeleteStatus('user-purge-7')

      // Act
      await service.purge('user-purge-7', 'john@example.com')

      // After purge, the cache should be invalidated.
      // Calling getSoftDeleteStatus again should hit the DB, not the cache.
      const freshDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }
      const freshService = new UserService(
        freshDb as never,
        mockEventEmitter as never,
        createMockUserPurgeService()
      )
      const result = await freshService.getSoftDeleteStatus('user-purge-7')

      // Assert -- cache was invalidated so the fresh DB query returns null (no user)
      expect(result).toBeNull()
      expect(freshDb.select).toHaveBeenCalled()
    })
  })
})
