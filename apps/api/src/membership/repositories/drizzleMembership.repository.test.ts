import { describe, expect, it, vi } from 'vitest'
import { DrizzleMembershipRepository } from './drizzleMembership.repository.js'

function createMockDb() {
  const terminal = vi.fn()

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    // where can chain (select→where→limit) OR be terminal (update/delete: set→where)
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => terminal()),
    innerJoin: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => terminal()),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn(),
    _terminal: terminal,
  }

  return { db: mockDb, terminal }
}

describe('DrizzleMembershipRepository', () => {
  describe('getOwnedOrganizations', () => {
    it('should return organizations where user is owner', async () => {
      const { db } = createMockDb()
      const orgs = [{ orgId: 'org-1', orgName: 'Acme', orgSlug: 'acme' }]
      db.where.mockResolvedValueOnce(orgs)
      const repo = new DrizzleMembershipRepository(db as never)

      const result = await repo.getOwnedOrganizations('user-1')

      expect(result).toEqual(orgs)
      expect(db.select).toHaveBeenCalled()
      expect(db.from).toHaveBeenCalled()
      expect(db.innerJoin).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
    })

    it('should return empty array when user owns no organizations', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValueOnce([])
      const repo = new DrizzleMembershipRepository(db as never)

      const result = await repo.getOwnedOrganizations('user-1')

      expect(result).toEqual([])
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const orgs = [{ orgId: 'org-1', orgName: 'Acme', orgSlug: null }]
      const tx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(orgs),
      }
      const repo = new DrizzleMembershipRepository(db as never)

      const result = await repo.getOwnedOrganizations('user-1', tx as never)

      expect(result).toEqual(orgs)
      expect(tx.select).toHaveBeenCalled()
      expect(db.select).not.toHaveBeenCalled()
    })

    it('should return orgSlug as null when not set', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValueOnce([{ orgId: 'org-2', orgName: 'No Slug', orgSlug: null }])
      const repo = new DrizzleMembershipRepository(db as never)

      const result = await repo.getOwnedOrganizations('user-1')

      expect(result[0]?.orgSlug).toBeNull()
    })
  })

  describe('verifyOrgOwnership', () => {
    it('should return role when user is a member of the org', async () => {
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([{ role: 'owner' }])
      const repo = new DrizzleMembershipRepository(db as never)

      const result = await repo.verifyOrgOwnership('org-1', 'user-1')

      expect(result).toEqual({ role: 'owner' })
      expect(db.select).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
      expect(db.limit).toHaveBeenCalledWith(1)
    })

    it('should return undefined when user is not a member', async () => {
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleMembershipRepository(db as never)

      const result = await repo.verifyOrgOwnership('org-1', 'other-user')

      expect(result).toBeUndefined()
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const tx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ role: 'member' }]),
      }
      const repo = new DrizzleMembershipRepository(db as never)

      const result = await repo.verifyOrgOwnership('org-1', 'user-1', tx as never)

      expect(result).toEqual({ role: 'member' })
      expect(tx.select).toHaveBeenCalled()
      expect(db.select).not.toHaveBeenCalled()
    })
  })

  describe('verifyTargetMember', () => {
    it('should return member id when member exists', async () => {
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([{ id: 'member-1' }])
      const repo = new DrizzleMembershipRepository(db as never)

      const result = await repo.verifyTargetMember('org-1', 'user-1')

      expect(result).toEqual({ id: 'member-1' })
      expect(db.select).toHaveBeenCalled()
      expect(db.limit).toHaveBeenCalledWith(1)
    })

    it('should return undefined when member does not exist', async () => {
      const { db, terminal } = createMockDb()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleMembershipRepository(db as never)

      const result = await repo.verifyTargetMember('org-1', 'nonexistent-user')

      expect(result).toBeUndefined()
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const tx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'member-99' }]),
      }
      const repo = new DrizzleMembershipRepository(db as never)

      const result = await repo.verifyTargetMember('org-1', 'user-1', tx as never)

      expect(result).toEqual({ id: 'member-99' })
      expect(db.select).not.toHaveBeenCalled()
    })
  })

  describe('transferOrgOwnership', () => {
    it('should update member role to owner', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleMembershipRepository(db as never)
      const now = new Date('2026-01-01')

      await repo.transferOrgOwnership('org-1', 'user-2', now)

      expect(db.update).toHaveBeenCalledTimes(1)
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'owner', updatedAt: now })
      )
      expect(db.where).toHaveBeenCalled()
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const tx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }
      const repo = new DrizzleMembershipRepository(db as never)

      await repo.transferOrgOwnership('org-1', 'user-2', new Date(), tx as never)

      expect(tx.update).toHaveBeenCalled()
      expect(db.update).not.toHaveBeenCalled()
    })
  })

  describe('softDeleteOrg', () => {
    it('should update organization with deletion timestamps', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleMembershipRepository(db as never)
      const now = new Date('2026-01-01')
      const deleteScheduledFor = new Date('2026-02-01')

      await repo.softDeleteOrg('org-1', now, deleteScheduledFor)

      expect(db.update).toHaveBeenCalledTimes(1)
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: now, deleteScheduledFor, updatedAt: now })
      )
      expect(db.where).toHaveBeenCalled()
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const tx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }
      const repo = new DrizzleMembershipRepository(db as never)

      await repo.softDeleteOrg('org-1', new Date(), new Date(), tx as never)

      expect(tx.update).toHaveBeenCalled()
      expect(db.update).not.toHaveBeenCalled()
    })
  })

  describe('clearOrgSessions', () => {
    it('should clear activeOrganizationId for all org sessions', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleMembershipRepository(db as never)

      await repo.clearOrgSessions('org-1')

      expect(db.update).toHaveBeenCalledTimes(1)
      expect(db.set).toHaveBeenCalledWith({ activeOrganizationId: null })
      expect(db.where).toHaveBeenCalled()
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const tx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }
      const repo = new DrizzleMembershipRepository(db as never)

      await repo.clearOrgSessions('org-1', tx as never)

      expect(tx.update).toHaveBeenCalled()
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should not throw when no sessions match', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleMembershipRepository(db as never)

      await expect(repo.clearOrgSessions('org-no-sessions')).resolves.toBeUndefined()
    })
  })

  describe('expireOrgInvitations', () => {
    it('should set status to expired for pending invitations', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleMembershipRepository(db as never)

      await repo.expireOrgInvitations('org-1')

      expect(db.update).toHaveBeenCalledTimes(1)
      expect(db.set).toHaveBeenCalledWith({ status: 'expired' })
      expect(db.where).toHaveBeenCalled()
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const tx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }
      const repo = new DrizzleMembershipRepository(db as never)

      await repo.expireOrgInvitations('org-1', tx as never)

      expect(tx.update).toHaveBeenCalled()
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should not throw when no pending invitations exist', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleMembershipRepository(db as never)

      await expect(repo.expireOrgInvitations('org-no-invites')).resolves.toBeUndefined()
    })
  })

  describe('deleteUserSessions', () => {
    it('should delete all sessions for the given user', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleMembershipRepository(db as never)

      await repo.deleteUserSessions('user-1')

      expect(db.delete).toHaveBeenCalled()
      expect(db.where).toHaveBeenCalled()
    })

    it('should use tx when provided', async () => {
      const { db } = createMockDb()
      const tx = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }
      const repo = new DrizzleMembershipRepository(db as never)

      await repo.deleteUserSessions('user-1', tx as never)

      expect(tx.delete).toHaveBeenCalled()
      expect(db.delete).not.toHaveBeenCalled()
    })

    it('should not throw when user has no sessions', async () => {
      const { db } = createMockDb()
      db.where.mockResolvedValue([])
      const repo = new DrizzleMembershipRepository(db as never)

      await expect(repo.deleteUserSessions('user-no-sessions')).resolves.toBeUndefined()
    })
  })

  describe('transaction', () => {
    it('should delegate to db.transaction', async () => {
      const { db } = createMockDb()
      const txFn = vi.fn().mockResolvedValue('result')
      db.transaction.mockResolvedValue('result')
      const repo = new DrizzleMembershipRepository(db as never)

      const result = await repo.transaction(txFn)

      expect(db.transaction).toHaveBeenCalledWith(txFn)
      expect(result).toBe('result')
    })
  })
})
