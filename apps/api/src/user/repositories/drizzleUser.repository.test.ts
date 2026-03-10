import { describe, expect, it, vi } from 'vitest'
import { DrizzleUserRepository } from './drizzleUser.repository.js'

function createMockDb() {
  const terminal = vi.fn()

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => terminal()),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockImplementation(() => terminal()),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => terminal()),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockImplementation(() => terminal()),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn(),
    _terminal: terminal,
  }

  return { db: mockDb, terminal }
}

const mockUserProfile = {
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

describe('DrizzleUserRepository', () => {
  describe('getSoftDeleteStatus', () => {
    it('should return status when user exists', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([{ deletedAt: null, deleteScheduledFor: null }])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.getSoftDeleteStatus('user-1')

      // Assert
      expect(result).toEqual({ deletedAt: null, deleteScheduledFor: null })
      expect(db.select).toHaveBeenCalled()
      expect(db.from).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
      expect(db.limit).toHaveBeenCalledWith(1)
    })

    it('should return null when user does not exist', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.getSoftDeleteStatus('missing-user')

      // Assert
      expect(result).toBeNull()
    })

    it('should use tx when provided', async () => {
      // Arrange
      const { db } = createMockDb()
      const tx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ deletedAt: null, deleteScheduledFor: null }]),
      }
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.getSoftDeleteStatus('user-1', tx as never)

      // Assert
      expect(result).toEqual({ deletedAt: null, deleteScheduledFor: null })
      expect(tx.select).toHaveBeenCalled()
      expect(db.select).not.toHaveBeenCalled()
    })
  })

  describe('getProfile', () => {
    it('should return profile when user exists', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([mockUserProfile])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.getProfile('user-1')

      // Assert
      expect(result).toEqual(mockUserProfile)
    })

    it('should return null when user does not exist', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.getProfile('missing-user')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('getNameFields', () => {
    it('should return name fields when user exists', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([
        { firstName: 'John', lastName: 'Doe', fullNameCustomized: false },
      ])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.getNameFields('user-1')

      // Assert
      expect(result).toEqual({ firstName: 'John', lastName: 'Doe', fullNameCustomized: false })
    })

    it('should return null when user does not exist', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.getNameFields('missing-user')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('updateProfile', () => {
    it('should update and return updated profile', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([mockUserProfile])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.updateProfile('user-1', { firstName: 'Jane' })

      // Assert
      expect(result).toEqual(mockUserProfile)
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
      expect(db.returning).toHaveBeenCalled()
    })

    it('should return undefined when no user matched (e.g., already deleted)', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.updateProfile('deleted-user', { firstName: 'Jane' })

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('findForValidation', () => {
    it('should return user data when user exists', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([{ id: 'user-1', email: 'john@example.com', deletedAt: null }])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.findForValidation('user-1')

      // Assert
      expect(result).toEqual({ id: 'user-1', email: 'john@example.com', deletedAt: null })
    })

    it('should return null when user does not exist', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.findForValidation('missing-user')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('softDeleteUser', () => {
    it('should update deletedAt fields and return result', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      const now = new Date('2026-01-01')
      const deleteScheduledFor = new Date('2026-02-01')
      const deletedProfile = { ...mockUserProfile, deletedAt: now, deleteScheduledFor }
      terminal.mockResolvedValueOnce([deletedProfile])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.softDeleteUser('user-1', now, deleteScheduledFor)

      // Assert
      expect(result).toEqual(deletedProfile)
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
      expect(db.returning).toHaveBeenCalled()
    })

    it('should return undefined when user not found', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.softDeleteUser('missing-user', new Date(), new Date())

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('reactivateUser', () => {
    it('should clear deletedAt fields and return reactivated user', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([mockUserProfile])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.reactivateUser('user-1')

      // Assert
      expect(result).toEqual(mockUserProfile)
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
    })

    it('should return undefined when user not found', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.reactivateUser('missing-user')

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('getOwnedOrganizations', () => {
    it('should return owned orgs via innerJoin', async () => {
      // Arrange
      const ownedOrgs = [{ orgId: 'org-1', orgName: 'Acme', orgSlug: 'acme' }]
      // getOwnedOrganizations chain ends with .where() — make where the terminal
      const { db } = createMockDb()
      db.where.mockResolvedValueOnce(ownedOrgs)
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.getOwnedOrganizations('user-1')

      // Assert
      expect(result).toEqual(ownedOrgs)
      expect(db.select).toHaveBeenCalled()
      expect(db.from).toHaveBeenCalled()
      expect(db.innerJoin).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
    })

    it('should return empty array when user owns no organizations', async () => {
      // Arrange
      const { db } = createMockDb()
      db.where.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.getOwnedOrganizations('user-1')

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('deleteUserSessions', () => {
    it('should delete sessions for the user', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      // delete().where() — terminal is where
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      await repo.deleteUserSessions('user-1')

      // Assert
      expect(db.delete).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
    })
  })

  describe('verifyOrgOwnership', () => {
    it('should return membership when found', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([{ role: 'owner' }])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.verifyOrgOwnership('org-1', 'user-1')

      // Assert
      expect(result).toEqual({ role: 'owner' })
    })

    it('should return undefined when membership not found', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.verifyOrgOwnership('org-1', 'user-1')

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('verifyTargetMember', () => {
    it('should return member ref when found', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([{ id: 'member-1' }])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.verifyTargetMember('org-1', 'user-1')

      // Assert
      expect(result).toEqual({ id: 'member-1' })
    })

    it('should return undefined when target member not found', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.verifyTargetMember('org-1', 'user-1')

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('transferOrgOwnership', () => {
    it('should update member role to owner', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)
      const now = new Date()

      // Act
      await repo.transferOrgOwnership('org-1', 'user-2', now)

      // Assert
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
    })
  })

  describe('softDeleteOrg', () => {
    it('should update org with deletedAt fields', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)
      const now = new Date()
      const deleteScheduledFor = new Date()

      // Act
      await repo.softDeleteOrg('org-1', now, deleteScheduledFor)

      // Assert
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
    })
  })

  describe('clearOrgSessions', () => {
    it('should update sessions to null activeOrganizationId', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      await repo.clearOrgSessions('org-1')

      // Assert
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
    })
  })

  describe('expireOrgInvitations', () => {
    it('should update pending invitations to expired', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserRepository(db as never)

      // Act
      await repo.expireOrgInvitations('org-1')

      // Assert
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
    })
  })

  describe('transaction', () => {
    it('should delegate to db.transaction', async () => {
      // Arrange
      const { db } = createMockDb()
      const txFn = vi.fn().mockResolvedValue('result')
      db.transaction.mockResolvedValue('result')
      const repo = new DrizzleUserRepository(db as never)

      // Act
      const result = await repo.transaction(txFn)

      // Assert
      expect(db.transaction).toHaveBeenCalledWith(txFn)
      expect(result).toBe('result')
    })
  })
})
