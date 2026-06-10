import { describe, expect, it, vi } from 'vitest'
import { DrizzleGdprExportRepository } from './gdprExport.repository.js'

function createMockDb() {
  const terminal = vi.fn()

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    // where can chain (select→where→limit) OR be terminal (select→innerJoin→where)
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => terminal()),
    innerJoin: vi.fn().mockReturnThis(),
    _terminal: terminal,
  }

  return { db: mockDb, terminal }
}

const mockUserData = {
  name: 'John Doe',
  email: 'john@example.com',
  image: null,
  role: 'user',
  emailVerified: true,
  createdAt: new Date('2025-01-01'),
}

const mockSessionData = {
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0',
  createdAt: new Date('2025-01-01'),
  expiresAt: new Date('2025-12-31'),
}

const mockAccountData = {
  providerId: 'google',
  scope: 'openid email',
  createdAt: new Date('2025-01-01'),
}

const mockOrgData = {
  name: 'Acme Corp',
  role: 'owner',
  joinedAt: new Date('2025-01-01'),
}

const mockConsentData = {
  categories: { analytics: true },
  action: 'accept',
  consentedAt: new Date('2025-01-01'),
  policyVersion: 'v1.0',
}

describe('DrizzleGdprExportRepository', () => {
  describe('fetchUserRecord', () => {
    it('should return user record for given userId', async () => {
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([mockUserData])
      const repo = new DrizzleGdprExportRepository(db as never)

      const result = await repo.fetchUserRecord('user-1')

      expect(result).toEqual([mockUserData])
      expect(db.select).toHaveBeenCalled()
      expect(db.from).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
      expect(db.limit).toHaveBeenCalledWith(1)
    })

    it('should return empty array when user not found', async () => {
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleGdprExportRepository(db as never)

      const result = await repo.fetchUserRecord('unknown-user')

      expect(result).toEqual([])
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const tx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUserData]),
      }
      const repo = new DrizzleGdprExportRepository(db as never)

      const result = await repo.fetchUserRecord('user-1', tx as never)

      expect(result).toEqual([mockUserData])
      expect(tx.select).toHaveBeenCalled()
      expect(db.select).not.toHaveBeenCalled()
    })
  })

  describe('fetchCoreUserData', () => {
    it('should return a 5-tuple with data from all sub-queries', async () => {
      // fetchCoreUserData calls fetchUserRecord + 4 parallel queries.
      // Fix #5: org query now ends with .limit() — all 5 queries use terminal via limit.
      const { db, terminal } = createMockDb()

      // All 5 queries end with .limit() → terminal is called 5 times
      terminal
        .mockResolvedValueOnce([mockUserData]) // fetchUserRecord (limit 1)
        .mockResolvedValueOnce([mockSessionData]) // sessions (limit 10000)
        .mockResolvedValueOnce([mockAccountData]) // accounts (limit 10000)
        .mockResolvedValueOnce([mockOrgData]) // orgs (limit 10000) — Fix #5
        .mockResolvedValueOnce([mockConsentData]) // consents (limit 10000)

      const repo = new DrizzleGdprExportRepository(db as never)

      const result = await repo.fetchCoreUserData('user-1')

      expect(result).toHaveLength(5)
      expect(result[0]).toEqual([mockUserData])
      expect(result[1]).toEqual([mockSessionData])
      expect(result[2]).toEqual([mockAccountData])
      expect(result[3]).toEqual([mockOrgData])
      expect(result[4]).toEqual([mockConsentData])
      // verify limit was called for the org query (Fix #5)
      expect(db.limit).toHaveBeenCalledWith(10_000)
    })

    it('should return empty arrays when user has no data', async () => {
      const { db, terminal } = createMockDb()

      // Fix #5: all 5 queries use terminal via limit
      terminal.mockResolvedValue([])

      const repo = new DrizzleGdprExportRepository(db as never)

      const result = await repo.fetchCoreUserData('empty-user')

      expect(result[0]).toEqual([])
      expect(result[1]).toEqual([])
      expect(result[2]).toEqual([])
      expect(result[3]).toEqual([])
      expect(result[4]).toEqual([])
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const txTerminal = vi.fn().mockResolvedValue([])
      // Fix #5: org query now chains .where → .limit, so all where calls return this
      const tx = {
        select: vi.fn(),
        from: vi.fn(),
        where: vi.fn(),
        limit: vi.fn().mockImplementation(() => txTerminal()),
        innerJoin: vi.fn(),
      }
      tx.select.mockReturnThis()
      tx.from.mockReturnThis()
      tx.innerJoin.mockReturnThis()
      tx.where.mockReturnThis() // all where calls chain to limit

      const repo = new DrizzleGdprExportRepository(db as never)

      await repo.fetchCoreUserData('user-1', tx as never)

      expect(tx.select).toHaveBeenCalled()
      expect(db.select).not.toHaveBeenCalled()
    })
  })

  describe('fetchAndDeduplicateInvitations', () => {
    // Both invitation queries end with .where() (no .limit) — override db.where per test

    it('should return sent invitations tagged as "sent"', async () => {
      const { db } = createMockDb()
      const sentInv = {
        email: 'alice@example.com',
        organizationName: 'Acme',
        role: 'member',
        status: 'pending',
      }
      db.where
        .mockResolvedValueOnce([sentInv]) // sent invitations
        .mockResolvedValueOnce([]) // received invitations
      const repo = new DrizzleGdprExportRepository(db as never)

      const result = await repo.fetchAndDeduplicateInvitations('user-1', 'user@example.com')

      expect(result).toEqual([{ ...sentInv, direction: 'sent' }])
    })

    it('should return received invitations tagged as "received"', async () => {
      const { db } = createMockDb()
      const receivedInv = {
        email: 'user@example.com',
        organizationName: 'Beta',
        role: 'admin',
        status: 'accepted',
      }
      db.where
        .mockResolvedValueOnce([]) // sent invitations
        .mockResolvedValueOnce([receivedInv]) // received invitations
      const repo = new DrizzleGdprExportRepository(db as never)

      const result = await repo.fetchAndDeduplicateInvitations('user-1', 'user@example.com')

      expect(result).toEqual([{ ...receivedInv, direction: 'received' }])
    })

    it('should deduplicate: exclude received invitation if already in sent (same org+email)', async () => {
      const { db } = createMockDb()
      const inv = {
        email: 'same@example.com',
        organizationName: 'SharedOrg',
        role: 'member',
        status: 'pending',
      }
      db.where
        .mockResolvedValueOnce([inv]) // sent
        .mockResolvedValueOnce([inv]) // received (same org+email → deduplicated)
      const repo = new DrizzleGdprExportRepository(db as never)

      const result = await repo.fetchAndDeduplicateInvitations('user-1', 'same@example.com')

      expect(result).toHaveLength(1)
      expect(result[0]?.direction).toBe('sent')
    })

    it('should include both sent and non-duplicate received invitations', async () => {
      const { db } = createMockDb()
      const sentInv = {
        email: 'alice@example.com',
        organizationName: 'OrgA',
        role: 'member',
        status: 'pending',
      }
      const receivedInv = {
        email: 'user@example.com',
        organizationName: 'OrgB',
        role: 'admin',
        status: 'pending',
      }
      db.where.mockResolvedValueOnce([sentInv]).mockResolvedValueOnce([receivedInv])
      const repo = new DrizzleGdprExportRepository(db as never)

      const result = await repo.fetchAndDeduplicateInvitations('user-1', 'user@example.com')

      expect(result).toHaveLength(2)
      expect(result.find((i) => i.direction === 'sent')).toBeDefined()
      expect(result.find((i) => i.direction === 'received')).toBeDefined()
    })

    it('should return empty array when user has no invitations', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValueOnce([]).mockResolvedValueOnce([])
      const repo = new DrizzleGdprExportRepository(db as never)

      const result = await repo.fetchAndDeduplicateInvitations('user-1', 'nobody@example.com')

      expect(result).toEqual([])
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const tx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi
          .fn()
          .mockResolvedValueOnce([]) // sent
          .mockResolvedValueOnce([]), // received
        innerJoin: vi.fn().mockReturnThis(),
      }
      const repo = new DrizzleGdprExportRepository(db as never)

      const result = await repo.fetchAndDeduplicateInvitations(
        'user-1',
        'user@example.com',
        tx as never
      )

      expect(result).toEqual([])
      expect(tx.select).toHaveBeenCalled()
      expect(db.select).not.toHaveBeenCalled()
    })
  })
})
