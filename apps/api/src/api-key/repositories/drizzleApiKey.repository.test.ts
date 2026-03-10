import { describe, expect, it, vi } from 'vitest'
import { DrizzleApiKeyRepository } from './drizzleApiKey.repository.js'

function createMockDb() {
  const terminal = vi.fn()

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => terminal()),
    orderBy: vi.fn().mockImplementation(() => terminal()),
    innerJoin: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => terminal()),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    _terminal: terminal,
  }

  return { db: mockDb, terminal }
}

const mockApiKeyInsertRow = {
  id: 'key-1',
  name: 'Production Key',
  keyPrefix: 'sk_live_',
  lastFour: 'abcd',
  scopes: ['api_keys:read'],
  expiresAt: null,
  createdAt: new Date('2025-01-01'),
}

const mockApiKeyListRow = {
  id: 'key-1',
  name: 'Production Key',
  keyPrefix: 'sk_live_',
  lastFour: 'abcd',
  scopes: ['api_keys:read'],
  rateLimitTier: 'standard',
  expiresAt: null,
  lastUsedAt: null,
  revokedAt: null,
  createdAt: new Date('2025-01-01'),
}

describe('DrizzleApiKeyRepository', () => {
  describe('insert', () => {
    it('should insert and return the new key row', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([mockApiKeyInsertRow])
      const repo = new DrizzleApiKeyRepository(db as never)
      const data = {
        id: 'key-1',
        tenantId: 'org-1',
        userId: 'user-1',
        name: 'Production Key',
        keyPrefix: 'sk_live_',
        keyHash: 'hash',
        keySalt: 'salt',
        lastFour: 'abcd',
        scopes: ['api_keys:read'] as string[],
        expiresAt: null,
      }

      // Act
      const result = await repo.insert(data)

      // Assert
      expect(result).toEqual(mockApiKeyInsertRow)
      expect(db.insert).toHaveBeenCalled()
      expect(db.values).toHaveBeenCalled()
      expect(db.returning).toHaveBeenCalled()
    })

    it('should return undefined when insert produces no row', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleApiKeyRepository(db as never)

      // Act
      const result = await repo.insert({
        id: 'key-1',
        tenantId: 'org-1',
        userId: 'user-1',
        name: 'Key',
        keyPrefix: 'sk_live_',
        keyHash: 'h',
        keySalt: 's',
        lastFour: 'abcd',
        scopes: [] as string[],
        expiresAt: null,
      })

      // Assert
      expect(result).toBeUndefined()
    })

    it('should use tx when provided', async () => {
      // Arrange
      const { db } = createMockDb()
      const tx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockApiKeyInsertRow]),
      }
      const repo = new DrizzleApiKeyRepository(db as never)

      // Act
      const result = await repo.insert(
        {
          id: 'key-1',
          tenantId: 'org-1',
          userId: 'user-1',
          name: 'Key',
          keyPrefix: 'sk_',
          keyHash: 'h',
          keySalt: 's',
          lastFour: 'abcd',
          scopes: [] as string[],
          expiresAt: null,
        },
        tx as never
      )

      // Assert
      expect(result).toEqual(mockApiKeyInsertRow)
      expect(tx.insert).toHaveBeenCalled()
      expect(db.insert).not.toHaveBeenCalled()
    })
  })

  describe('list', () => {
    it('should return keys for tenant ordered by createdAt', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([mockApiKeyListRow])
      const repo = new DrizzleApiKeyRepository(db as never)

      // Act
      const result = await repo.list('org-1')

      // Assert
      expect(result).toEqual([mockApiKeyListRow])
      expect(db.select).toHaveBeenCalled()
      expect(db.from).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
      expect(db.orderBy).toHaveBeenCalled()
    })

    it('should return empty array when no keys for tenant', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleApiKeyRepository(db as never)

      // Act
      const result = await repo.list('org-1')

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('findForRevoke', () => {
    it('should return key revoke row when found', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([{ id: 'key-1', revokedAt: null }])
      const repo = new DrizzleApiKeyRepository(db as never)

      // Act
      const result = await repo.findForRevoke('key-1', 'org-1')

      // Assert
      expect(result).toEqual({ id: 'key-1', revokedAt: null })
      expect(db.select).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
      expect(db.limit).toHaveBeenCalledWith(1)
    })

    it('should return undefined when key not found', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleApiKeyRepository(db as never)

      // Act
      const result = await repo.findForRevoke('missing-key', 'org-1')

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('markRevoked', () => {
    it('should update revokedAt on the key', async () => {
      // Arrange
      const { db } = createMockDb()
      db.where.mockResolvedValueOnce([])
      const repo = new DrizzleApiKeyRepository(db as never)
      const now = new Date()

      // Act
      await repo.markRevoked('key-1', now)

      // Assert
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
    })
  })

  describe('findCandidatesByLastFour', () => {
    it('should return matching keys via innerJoin with isNull filter', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      const candidates = [
        {
          id: 'key-1',
          userId: 'user-1',
          tenantId: 'org-1',
          scopes: ['api_keys:read'],
          keyHash: 'hash',
          keySalt: 'salt',
          revokedAt: null,
          expiresAt: null,
          role: 'user',
        },
      ]
      terminal.mockResolvedValueOnce(candidates)
      const repo = new DrizzleApiKeyRepository(db as never)

      // Act
      const result = await repo.findCandidatesByLastFour('abcd')

      // Assert
      expect(result).toEqual(candidates)
      expect(db.select).toHaveBeenCalled()
      expect(db.from).toHaveBeenCalled()
      expect(db.innerJoin).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
      expect(db.limit).toHaveBeenCalledWith(10)
    })

    it('should return empty array when no candidates match', async () => {
      // Arrange
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleApiKeyRepository(db as never)

      // Act
      const result = await repo.findCandidatesByLastFour('zzzz')

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('touchLastUsedAt', () => {
    it('should update lastUsedAt on the key', async () => {
      // Arrange
      const { db } = createMockDb()
      db.where.mockResolvedValueOnce([])
      const repo = new DrizzleApiKeyRepository(db as never)

      // Act
      await repo.touchLastUsedAt('key-1')

      // Assert
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
    })
  })

  describe('revokeAllForUser', () => {
    it('should revoke all active keys for a user', async () => {
      // Arrange
      const { db } = createMockDb()
      db.where.mockResolvedValueOnce([])
      const repo = new DrizzleApiKeyRepository(db as never)
      const now = new Date()

      // Act
      await repo.revokeAllForUser('user-1', now)

      // Assert
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
    })
  })

  describe('revokeAllForOrg', () => {
    it('should revoke all active keys for an org', async () => {
      // Arrange
      const { db } = createMockDb()
      db.where.mockResolvedValueOnce([])
      const repo = new DrizzleApiKeyRepository(db as never)
      const now = new Date()

      // Act
      await repo.revokeAllForOrg('org-1', now)

      // Assert
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
    })
  })
})
