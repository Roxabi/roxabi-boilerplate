import { describe, expect, it, vi } from 'vitest'
import { DrizzleOrganizationPurgeRepository } from './organizationPurge.repository.js'

function createMockDb() {
  const terminal = vi.fn()

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    // where can be either terminal (delete/update chains) or chainable (select + limit)
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => terminal()),
    innerJoin: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    _terminal: terminal,
  }

  return { db: mockDb, terminal }
}

const mockOrg = {
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
}

describe('DrizzleOrganizationPurgeRepository', () => {
  describe('findExpiredOrganizations', () => {
    it('should return organizations scheduled for deletion before now', async () => {
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([mockOrg])
      const repo = new DrizzleOrganizationPurgeRepository(db as never)
      const now = new Date('2026-01-01')

      const result = await repo.findExpiredOrganizations(now)

      expect(result).toEqual([mockOrg])
      expect(db.select).toHaveBeenCalled()
      expect(db.from).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
      expect(db.limit).toHaveBeenCalledWith(100)
    })

    it('should return empty array when no expired organizations', async () => {
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleOrganizationPurgeRepository(db as never)

      const result = await repo.findExpiredOrganizations(new Date())

      expect(result).toEqual([])
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const tx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockOrg]),
      }
      const repo = new DrizzleOrganizationPurgeRepository(db as never)

      const result = await repo.findExpiredOrganizations(new Date(), tx as never)

      expect(result).toEqual([mockOrg])
      expect(tx.select).toHaveBeenCalled()
      expect(db.select).not.toHaveBeenCalled()
    })

    it('should return null-slug organizations', async () => {
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([{ id: 'org-2', name: 'No Slug Org', slug: null }])
      const repo = new DrizzleOrganizationPurgeRepository(db as never)

      const result = await repo.findExpiredOrganizations(new Date())

      expect(result).toEqual([{ id: 'org-2', name: 'No Slug Org', slug: null }])
    })
  })

  describe('anonymizeOrganization', () => {
    it('should update org, delete members, invitations, and roles', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleOrganizationPurgeRepository(db as never)
      const now = new Date('2026-01-01')

      await repo.anonymizeOrganization('org-1', 'deleted-org-abc123', now)

      // 1 update (anonymize org)
      expect(db.update).toHaveBeenCalledTimes(1)
      expect(db.set).toHaveBeenCalledTimes(1)
      // 3 deletes: members, invitations, roles
      expect(db.delete).toHaveBeenCalledTimes(3)
      expect(db.where).toHaveBeenCalledTimes(4) // 1 update + 3 deletes
    })

    it('should set org name to "Deleted Organization" and clear logo/metadata', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleOrganizationPurgeRepository(db as never)
      const now = new Date('2026-06-10')

      await repo.anonymizeOrganization('org-1', 'anon-slug-xyz', now)

      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Deleted Organization',
          slug: 'anon-slug-xyz',
          logo: null,
          metadata: null,
          updatedAt: now,
        })
      )
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const tx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockReturnThis(),
      }
      const repo = new DrizzleOrganizationPurgeRepository(db as never)

      await repo.anonymizeOrganization('org-1', 'anon-slug', new Date(), tx as never)

      expect(tx.update).toHaveBeenCalledTimes(1)
      expect(tx.delete).toHaveBeenCalledTimes(3)
      expect(db.update).not.toHaveBeenCalled()
      expect(db.delete).not.toHaveBeenCalled()
    })

    it('should not throw when org has no members or invitations', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleOrganizationPurgeRepository(db as never)

      await expect(
        repo.anonymizeOrganization('empty-org', 'anon-slug', new Date())
      ).resolves.toBeUndefined()
    })
  })
})
