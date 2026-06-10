import { describe, expect, it, vi } from 'vitest'
import { DrizzleGdprAnonymizationRepository } from './gdprAnonymization.repository.js'

function createMockDb() {
  const terminal = vi.fn()

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => terminal()),
    limit: vi.fn().mockImplementation(() => terminal()),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    _terminal: terminal,
  }

  return { db: mockDb, terminal }
}

describe('DrizzleGdprAnonymizationRepository', () => {
  describe('deleteUserSessions', () => {
    it('should delete sessions for the given userId', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleGdprAnonymizationRepository(db as never)

      await repo.deleteUserSessions('user-1')

      expect(db.delete).toHaveBeenCalledTimes(1)
      expect(db.where).toHaveBeenCalledTimes(1)
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const tx = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }
      const repo = new DrizzleGdprAnonymizationRepository(db as never)

      await repo.deleteUserSessions('user-1', tx as never)

      expect(tx.delete).toHaveBeenCalledTimes(1)
      expect(tx.where).toHaveBeenCalledTimes(1)
      expect(db.delete).not.toHaveBeenCalled()
    })

    it('should not throw when no sessions exist', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleGdprAnonymizationRepository(db as never)

      await expect(repo.deleteUserSessions('unknown-user')).resolves.toBeUndefined()
    })
  })

  describe('deleteUserAccounts', () => {
    it('should delete user record for the given userId', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleGdprAnonymizationRepository(db as never)

      await repo.deleteUserAccounts('user-1')

      expect(db.delete).toHaveBeenCalledTimes(1)
      expect(db.where).toHaveBeenCalledTimes(1)
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const tx = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }
      const repo = new DrizzleGdprAnonymizationRepository(db as never)

      await repo.deleteUserAccounts('user-1', tx as never)

      expect(tx.delete).toHaveBeenCalledTimes(1)
      expect(tx.where).toHaveBeenCalledTimes(1)
      expect(db.delete).not.toHaveBeenCalled()
    })

    it('should not throw when user does not exist', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleGdprAnonymizationRepository(db as never)

      await expect(repo.deleteUserAccounts('unknown-user')).resolves.toBeUndefined()
    })
  })
})
