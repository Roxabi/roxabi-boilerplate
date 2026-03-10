import { describe, expect, it, vi } from 'vitest'
import { DrizzleOrgRepository } from './drizzleOrg.repository.js'

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
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn(),
    _terminal: terminal,
  }

  return { db: mockDb, terminal }
}

const mockOrgListRow = {
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme',
  logo: null,
  createdAt: new Date('2025-01-01'),
}

const mockOrgSoftDeleteRow = {
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme',
  deletedAt: new Date('2026-01-01'),
  deleteScheduledFor: new Date('2026-02-01'),
}

describe('DrizzleOrgRepository', () => {
  describe('listForUser', () => {
    it('should return active orgs for user via innerJoin ordered by name', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([mockOrgListRow])
      const repo = new DrizzleOrgRepository(db as never)

      // Act
      const result = await repo.listForUser('user-1')

      // Assert
      expect(result).toEqual([mockOrgListRow])
      expect(db.select).toHaveBeenCalled()
      expect(db.from).toHaveBeenCalled()
      expect(db.innerJoin).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
      expect(db.orderBy).toHaveBeenCalled()
    })

    it('should return empty array when user has no orgs', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleOrgRepository(db as never)

      // Act
      const result = await repo.listForUser('user-1')

      // Assert
      expect(result).toEqual([])
    })

    it('should use tx when provided', async () => {
      // Arrange
      const { db } = createMockDb()
      const tx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockOrgListRow]),
      }
      const repo = new DrizzleOrgRepository(db as never)

      // Act
      const result = await repo.listForUser('user-1', tx as never)

      // Assert
      expect(result).toEqual([mockOrgListRow])
      expect(tx.select).toHaveBeenCalled()
      expect(db.select).not.toHaveBeenCalled()
    })
  })

  describe('findActiveOrg', () => {
    it('should return org when found and active', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([{ id: 'org-1', name: 'Acme Corp' }])
      const repo = new DrizzleOrgRepository(db as never)

      // Act
      const result = await repo.findActiveOrg('org-1')

      // Assert
      expect(result).toEqual({ id: 'org-1', name: 'Acme Corp' })
      expect(db.select).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
      expect(db.limit).toHaveBeenCalledWith(1)
    })

    it('should return undefined when org not found or deleted', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleOrgRepository(db as never)

      // Act
      const result = await repo.findActiveOrg('deleted-org')

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('findOrgForReactivate', () => {
    it('should return org with deletedAt when found', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([{ id: 'org-1', deletedAt: new Date('2026-01-01') }])
      const repo = new DrizzleOrgRepository(db as never)

      // Act
      const result = await repo.findOrgForReactivate('org-1')

      // Assert
      expect(result).toEqual({ id: 'org-1', deletedAt: new Date('2026-01-01') })
    })

    it('should return undefined when org not found', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleOrgRepository(db as never)

      // Act
      const result = await repo.findOrgForReactivate('missing-org')

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('checkOwnership', () => {
    it('should return membership when user is owner', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([{ role: 'owner' }])
      const repo = new DrizzleOrgRepository(db as never)

      // Act
      const result = await repo.checkOwnership('org-1', 'user-1')

      // Assert
      expect(result).toEqual({ role: 'owner' })
    })

    it('should return undefined when user is not a member', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleOrgRepository(db as never)

      // Act
      const result = await repo.checkOwnership('org-1', 'user-1')

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('softDeleteOrg', () => {
    it('should update org with deletedAt fields and return result', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([mockOrgSoftDeleteRow])
      const repo = new DrizzleOrgRepository(db as never)
      const now = new Date('2026-01-01')
      const deleteScheduledFor = new Date('2026-02-01')

      // Act
      const result = await repo.softDeleteOrg('org-1', now, deleteScheduledFor)

      // Assert
      expect(result).toEqual(mockOrgSoftDeleteRow)
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
      expect(db.returning).toHaveBeenCalled()
    })

    it('should return undefined when org not found', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleOrgRepository(db as never)

      // Act
      const result = await repo.softDeleteOrg('missing-org', new Date(), new Date())

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('clearOrgSessions', () => {
    it('should nullify activeOrganizationId on sessions', async () => {
      // Arrange
      const { db } = createMockDb()
      db.where.mockResolvedValueOnce([])
      const repo = new DrizzleOrgRepository(db as never)

      // Act
      await repo.clearOrgSessions('org-1')

      // Assert
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
    })
  })

  describe('expireOrgInvitations', () => {
    it('should expire pending invitations for org', async () => {
      // Arrange
      const { db } = createMockDb()
      db.where.mockResolvedValueOnce([])
      const repo = new DrizzleOrgRepository(db as never)

      // Act
      await repo.expireOrgInvitations('org-1')

      // Assert
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
    })
  })

  describe('reactivateOrg', () => {
    it('should clear deletedAt fields and return updated org', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      const reactivated = { ...mockOrgSoftDeleteRow, deletedAt: null, deleteScheduledFor: null }
      terminal.mockResolvedValueOnce([reactivated])
      const repo = new DrizzleOrgRepository(db as never)
      const now = new Date()

      // Act
      const result = await repo.reactivateOrg('org-1', now)

      // Assert
      expect(result).toEqual(reactivated)
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
      expect(db.returning).toHaveBeenCalled()
    })

    it('should return undefined when org not found', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleOrgRepository(db as never)

      // Act
      const result = await repo.reactivateOrg('missing-org', new Date())

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('getDeletionImpact', () => {
    it('should return member, invitation, and custom role counts', async () => {
      // Arrange
      // getDeletionImpact uses select().from().where() x3 — where() is the terminal each time
      const { db } = createMockDb()
      db.where
        .mockResolvedValueOnce([{ count: 5 }]) // members
        .mockResolvedValueOnce([{ count: 3 }]) // pending invitations
        .mockResolvedValueOnce([{ count: 2 }]) // custom roles

      const repo = new DrizzleOrgRepository(db as never)

      // Act
      const result = await repo.getDeletionImpact('org-1')

      // Assert
      expect(result).toEqual({
        memberCount: 5,
        invitationCount: 3,
        customRoleCount: 2,
      })
      expect(db.select).toHaveBeenCalledTimes(3)
    })

    it('should return zeros when no impact data exists', async () => {
      // Arrange
      const { db } = createMockDb()
      db.where
        .mockResolvedValueOnce([]) // members — undefined memberResult
        .mockResolvedValueOnce([]) // invitations — undefined invitationResult
        .mockResolvedValueOnce([]) // roles — undefined roleResult

      const repo = new DrizzleOrgRepository(db as never)

      // Act
      const result = await repo.getDeletionImpact('org-1')

      // Assert
      expect(result).toEqual({
        memberCount: 0,
        invitationCount: 0,
        customRoleCount: 0,
      })
    })
  })

  describe('transaction', () => {
    it('should delegate to db.transaction', async () => {
      // Arrange
      const { db } = createMockDb()
      const txFn = vi.fn().mockResolvedValue('result')
      db.transaction.mockResolvedValue('result')
      const repo = new DrizzleOrgRepository(db as never)

      // Act
      const result = await repo.transaction(txFn)

      // Assert
      expect(db.transaction).toHaveBeenCalledWith(txFn)
      expect(result).toBe('result')
    })
  })
})
