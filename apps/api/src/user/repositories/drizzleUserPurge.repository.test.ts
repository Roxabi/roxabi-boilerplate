import { describe, expect, it, vi } from 'vitest'
import { DrizzleUserPurgeRepository } from './drizzleUserPurge.repository.js'

function createMockDb() {
  const terminal = vi.fn()

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => terminal()),
    innerJoin: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => terminal()),
    delete: vi.fn().mockReturnThis(),
    _terminal: terminal,
  }

  return { db: mockDb, terminal }
}

describe('DrizzleUserPurgeRepository', () => {
  describe('findForPurgeValidation', () => {
    it('should return user data when user exists', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([
        { id: 'user-1', email: 'john@example.com', deletedAt: new Date('2026-01-01') },
      ])
      const repo = new DrizzleUserPurgeRepository(db as never)

      // Act
      const result = await repo.findForPurgeValidation('user-1')

      // Assert
      expect(result).toEqual({
        id: 'user-1',
        email: 'john@example.com',
        deletedAt: new Date('2026-01-01'),
      })
      expect(db.select).toHaveBeenCalled()
      expect(db.from).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
      expect(db.limit).toHaveBeenCalledWith(1)
    })

    it('should return null when user does not exist', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleUserPurgeRepository(db as never)

      // Act
      const result = await repo.findForPurgeValidation('missing-user')

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
        limit: vi.fn().mockResolvedValue([{ id: 'user-1', email: 'a@b.com', deletedAt: null }]),
      }
      const repo = new DrizzleUserPurgeRepository(db as never)

      // Act
      const result = await repo.findForPurgeValidation('user-1', tx as never)

      // Assert
      expect(result).toEqual({ id: 'user-1', email: 'a@b.com', deletedAt: null })
      expect(tx.select).toHaveBeenCalled()
      expect(db.select).not.toHaveBeenCalled()
    })
  })

  describe('anonymizeUserRecords', () => {
    it('should call update and 5 deletes (sessions, accounts, verifications, invitations x2)', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      // update().set().where() -> terminal (via where fn directly)
      // delete().where() x5 -> terminal
      terminal.mockResolvedValue([])
      // where is used as terminal for update (no returning) and delete
      db.where.mockResolvedValue([])
      const repo = new DrizzleUserPurgeRepository(db as never)
      const now = new Date()

      // Act
      await repo.anonymizeUserRecords('user-1', 'john@example.com', now)

      // Assert
      expect(db.update).toHaveBeenCalledTimes(1)
      expect(db.set).toHaveBeenCalledTimes(1)
      expect(db.delete).toHaveBeenCalledTimes(5)
    })

    it('should use tx when provided', async () => {
      // Arrange
      const { db } = createMockDb()
      const tx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockReturnThis(),
      }
      const repo = new DrizzleUserPurgeRepository(db as never)

      // Act
      await repo.anonymizeUserRecords('user-1', 'john@example.com', new Date(), tx as never)

      // Assert
      expect(tx.update).toHaveBeenCalledTimes(1)
      expect(tx.delete).toHaveBeenCalledTimes(5)
      expect(db.update).not.toHaveBeenCalled()
    })
  })

  describe('purgeOwnedOrganizations', () => {
    it('should find owned deleted orgs and process each one', async () => {
      // Arrange
      const ownedOrgs = [{ orgId: 'org-1' }, { orgId: 'org-2' }]
      // Flow:
      //   initial: select().from().innerJoin().where()  → ownedOrgs (where is terminal #1)
      //   per org: update().set().where()               → [] (where is terminal #2, #4)
      //            delete().where() x3                  → [] (where is terminal #3, #5, #6, #7, #8, #9)
      //   final:   delete().where()                     → [] (where is terminal #last)
      // Use mockResolvedValueOnce for the first call, then mockResolvedValue for the rest
      const { db } = createMockDb()
      db.where
        .mockResolvedValueOnce(ownedOrgs) // first call: owned orgs query
        .mockResolvedValue([]) // all subsequent: empty (updates/deletes)

      const repo = new DrizzleUserPurgeRepository(db as never)
      const now = new Date()

      // Act
      await repo.purgeOwnedOrganizations('user-1', now)

      // Assert
      // Per org: 1 update + 3 deletes = 4 where calls per org × 2 orgs + 1 initial + 1 final
      expect(db.update).toHaveBeenCalledTimes(2) // once per org
      expect(db.delete).toHaveBeenCalledTimes(7) // 3 per org × 2 + 1 final for user memberships
    })

    it('should skip loop and only delete memberships when no owned orgs', async () => {
      // Arrange
      const { db } = createMockDb()
      // First where call (owned orgs query) returns empty → skip loop
      // Final where call (delete user memberships) also resolves
      db.where.mockResolvedValue([])
      const repo = new DrizzleUserPurgeRepository(db as never)

      // Act
      await repo.purgeOwnedOrganizations('user-1', new Date())

      // Assert
      expect(db.update).not.toHaveBeenCalled()
      // Only the final delete for user memberships
      expect(db.delete).toHaveBeenCalledTimes(1)
    })
  })
})
