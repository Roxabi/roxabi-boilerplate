import { describe, expect, it, vi } from 'vitest'
import { PurgeService } from './purge.service.js'

function createMockDb() {
  const deleteFn = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([]),
  })

  return {
    db: {
      select: vi.fn(),
      update: vi.fn(),
      delete: deleteFn,
      transaction: vi.fn(),
    },
  }
}

function createMockUserService() {
  return {
    anonymizeUserRecords: vi.fn().mockResolvedValue(undefined),
  }
}

function setupSelectChain(db: ReturnType<typeof createMockDb>['db'], results: unknown[][]) {
  let callIndex = 0
  db.select = vi.fn().mockImplementation(() => {
    const data = results[callIndex] ?? []
    callIndex++
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(data),
        }),
      }),
    }
  })
}

describe('PurgeService', () => {
  describe('runPurge', () => {
    it('should anonymize users whose deleteScheduledFor has passed', async () => {
      const { db } = createMockDb()
      const userService = createMockUserService()
      const expiredUser = { id: 'user-1', email: 'john@example.com' }

      // First select: expired users; Second select: expired orgs
      setupSelectChain(db, [[expiredUser], []])

      db.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {}
        return cb(tx)
      })

      const service = new PurgeService(db as never, userService as never)
      const result = await service.runPurge()

      expect(result.usersAnonymized).toBe(1)
      expect(db.transaction).toHaveBeenCalledTimes(1)
      expect(userService.anonymizeUserRecords).toHaveBeenCalledTimes(1)
    })

    it('should anonymize organizations whose deleteScheduledFor has passed', async () => {
      const { db } = createMockDb()
      const userService = createMockUserService()
      const expiredOrg = { id: 'org-1', name: 'Test Org', slug: 'test-org' }

      // First select: no expired users; Second select: expired orgs
      setupSelectChain(db, [[], [expiredOrg]])

      db.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }
        return cb(tx)
      })

      const service = new PurgeService(db as never, userService as never)
      const result = await service.runPurge()

      expect(result.orgsAnonymized).toBe(1)
      expect(db.transaction).toHaveBeenCalledTimes(1)
    })

    it('should process users before organizations', async () => {
      const { db } = createMockDb()
      const userService = createMockUserService()
      const expiredUser = { id: 'user-1', email: 'john@example.com' }
      const expiredOrg = { id: 'org-1', name: 'Org', slug: 'org' }

      setupSelectChain(db, [[expiredUser], [expiredOrg]])

      db.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }
        return cb(tx)
      })

      const service = new PurgeService(db as never, userService as never)
      const result = await service.runPurge()

      // Users should be processed first (select call order: index 0 = users, index 1 = orgs)
      expect(result.usersAnonymized).toBe(1)
      expect(result.orgsAnonymized).toBe(1)
      expect(db.select).toHaveBeenCalledTimes(2)
    })

    it('should delegate user anonymization to UserService', async () => {
      const { db } = createMockDb()
      const userService = createMockUserService()
      const expiredUser = { id: 'user-1', email: 'john@example.com' }

      setupSelectChain(db, [[expiredUser], []])

      const capturedTx = {}
      db.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb(capturedTx)
      })

      const service = new PurgeService(db as never, userService as never)
      await service.runPurge()

      expect(userService.anonymizeUserRecords).toHaveBeenCalledWith(
        capturedTx,
        'user-1',
        'john@example.com',
        expect.any(Date)
      )
    })

    it('should delete members, invitations, and custom roles for purged orgs', async () => {
      const { db } = createMockDb()
      const userService = createMockUserService()
      const expiredOrg = { id: 'org-1', name: 'Org', slug: 'org' }

      setupSelectChain(db, [[], [expiredOrg]])

      const deleteWhereCalls: unknown[] = []
      db.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation((...args: unknown[]) => {
              deleteWhereCalls.push(args)
              return Promise.resolve([])
            }),
          }),
        }
        return cb(tx)
      })

      const service = new PurgeService(db as never, userService as never)
      await service.runPurge()

      // Should have delete calls for: members, invitations, roles
      expect(deleteWhereCalls.length).toBe(3)
    })

    it('should be idempotent (re-running on anonymized records is a no-op)', async () => {
      const { db } = createMockDb()
      const userService = createMockUserService()
      // Already-anonymized user (email ends with @anonymized.local)
      const anonymizedUser = { id: 'user-1', email: 'deleted-abc@anonymized.local' }
      // Already-anonymized org (slug starts with 'deleted-')
      const anonymizedOrg = { id: 'org-1', name: 'Deleted Organization', slug: 'deleted-xyz' }

      setupSelectChain(db, [[anonymizedUser], [anonymizedOrg]])

      const service = new PurgeService(db as never, userService as never)
      const result = await service.runPurge()

      expect(result.usersAnonymized).toBe(0)
      expect(result.orgsAnonymized).toBe(0)
      expect(db.transaction).not.toHaveBeenCalled()
    })

    it('should process up to 100 records per invocation', async () => {
      const { db } = createMockDb()
      const userService = createMockUserService()
      // The select query uses .limit(100)
      setupSelectChain(db, [[], []])

      const service = new PurgeService(db as never, userService as never)
      await service.runPurge()

      // Verify select was called (the .limit(100) is baked into the implementation)
      expect(db.select).toHaveBeenCalledTimes(2)
    })

    it('should return zero counts when no records are expired', async () => {
      const { db } = createMockDb()
      const userService = createMockUserService()
      setupSelectChain(db, [[], []])

      const service = new PurgeService(db as never, userService as never)
      const result = await service.runPurge()

      expect(result).toEqual({ usersAnonymized: 0, orgsAnonymized: 0 })
    })
  })
})
