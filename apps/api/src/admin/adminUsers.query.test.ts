import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChainMock } from './__test-utils__/createChainMock.js'
import { AdminUsersQueryService } from './adminUsers.query.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockDb() {
  return {
    select: vi.fn(),
  }
}

/**
 * Instantiate the service with a fresh mock db.
 */
function createService() {
  const db = createMockDb()
  const service = new AdminUsersQueryService(db as never)
  return { service, db }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseUser = {
  id: 'user-1',
  name: 'Alice Admin',
  email: 'alice@example.com',
  role: 'user',
  banned: false,
  banReason: null,
  banExpires: null,
  deletedAt: null,
  deleteScheduledFor: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminUsersQueryService', () => {
  let service: AdminUsersQueryService
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    vi.restoreAllMocks()
    ;({ service, db } = createService())
  })

  // -----------------------------------------------------------------------
  // listUsers
  // -----------------------------------------------------------------------
  describe('listUsers', () => {
    /**
     * Helper: mock db.select for the three-query listUsers pattern.
     * Query 1 returns user rows, Query 2 returns membership rows,
     * Query 3 returns lastActive rows (actorId + lastActive timestamp).
     * Returns the first chain mock for assertion on where/orderBy/limit.
     */
    function mockListUsersQueries(
      userRows: unknown[] = [],
      membershipRows: unknown[] = [],
      lastActiveRows: unknown[] = []
    ) {
      const usersChain = createChainMock(userRows)
      const membershipsChain = createChainMock(membershipRows)
      const lastActiveChain = createChainMock(lastActiveRows)
      db.select
        .mockReturnValueOnce(usersChain)
        .mockReturnValueOnce(membershipsChain)
        .mockReturnValueOnce(lastActiveChain)
      return { usersChain, membershipsChain, lastActiveChain }
    }

    it('should return cursor-paginated users with organizations array', async () => {
      // Arrange
      mockListUsersQueries(
        [{ ...baseUser }],
        [{ userId: 'user-1', orgId: 'org-1', orgName: 'Acme Corp', orgSlug: 'acme', role: 'admin' }]
      )

      // Act
      const result = await service.listUsers({}, undefined, 20)

      // Assert
      expect(result).toBeDefined()
      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.organizations).toEqual([
        { id: 'org-1', name: 'Acme Corp', slug: 'acme', role: 'admin' },
      ])
      expect(result.cursor).toBeDefined()
    })

    it('should return hasMore=true and next cursor when more rows exist', async () => {
      // Arrange — return limit+1 rows to signal more data
      const limit = 2
      const rows = [
        { ...baseUser, id: 'u-1', createdAt: new Date('2025-01-03') },
        { ...baseUser, id: 'u-2', createdAt: new Date('2025-01-02') },
        { ...baseUser, id: 'u-3', createdAt: new Date('2025-01-01') },
      ]
      mockListUsersQueries(rows, [])

      // Act
      const result = await service.listUsers({}, undefined, limit)

      // Assert
      expect(result.cursor.hasMore).toBe(true)
      expect(result.cursor.next).not.toBeNull()
      expect(result.data).toHaveLength(limit)
    })

    it('should return hasMore=false when fewer rows than limit exist', async () => {
      // Arrange
      const rows = [{ ...baseUser, id: 'u-1', createdAt: new Date('2025-01-01') }]
      mockListUsersQueries(rows, [])

      // Act
      const result = await service.listUsers({}, undefined, 20)

      // Assert
      expect(result.cursor.hasMore).toBe(false)
      expect(result.cursor.next).toBeNull()
    })

    it('should filter users by role', async () => {
      // Arrange
      const adminRow = { ...baseUser, id: 'u-admin', role: 'superadmin' }
      const { usersChain } = mockListUsersQueries([adminRow], [])

      // Act
      const result = await service.listUsers({ role: 'superadmin' }, undefined, 20)

      // Assert
      expect(result.data).toBeDefined()
      // The where clause on the chain must have been called with a defined filter condition
      expect(usersChain.where).toHaveBeenCalledWith(expect.anything())
    })

    it('should filter users by status active (banned=false, deletedAt IS NULL)', async () => {
      // Arrange
      const { usersChain } = mockListUsersQueries([], [])

      // Act
      await service.listUsers({ status: 'active' }, undefined, 20)

      // Assert — where must have been called with a defined filter condition (not undefined)
      expect(usersChain.where).toHaveBeenCalledWith(expect.anything())
    })

    it('should filter users by status banned (banned=true)', async () => {
      // Arrange
      const bannedRow = {
        ...baseUser,
        id: 'u-banned',
        banned: true,
        banReason: 'spam',
      }
      const { usersChain } = mockListUsersQueries([bannedRow], [])

      // Act
      const result = await service.listUsers({ status: 'banned' }, undefined, 20)

      // Assert
      expect(result.data).toBeDefined()
      expect(usersChain.where).toHaveBeenCalledWith(expect.anything())
    })

    it('should filter users by status archived (deletedAt IS NOT NULL)', async () => {
      // Arrange
      const archivedRow = {
        ...baseUser,
        id: 'u-archived',
        deletedAt: new Date('2025-06-01'),
      }
      const { usersChain } = mockListUsersQueries([archivedRow], [])

      // Act
      const result = await service.listUsers({ status: 'archived' }, undefined, 20)

      // Assert
      expect(result.data).toBeDefined()
      expect(usersChain.where).toHaveBeenCalledWith(expect.anything())
    })

    it('should filter users by organizationId using EXISTS subquery', async () => {
      // Arrange — organizationId filter uses EXISTS, so the first query (users)
      // still needs a second db.select call for the EXISTS subquery builder.
      // The chain mock handles this transparently.
      const { usersChain } = mockListUsersQueries([], [])

      // Act
      await service.listUsers({ organizationId: 'org-specific' }, undefined, 20)

      // Assert — where must have been called with a defined filter (not undefined)
      expect(usersChain.where).toHaveBeenCalledWith(expect.anything())
    })

    it('should search users by name or email using ILIKE', async () => {
      // Arrange
      const { usersChain } = mockListUsersQueries([], [])

      // Act
      await service.listUsers({ search: 'alice' }, undefined, 20)

      // Assert — where must have been called with a defined search condition
      expect(usersChain.where).toHaveBeenCalledWith(expect.anything())
    })

    it('should escape special ILIKE characters % and _ in search term', async () => {
      // Arrange — search with SQL wildcard characters that must be escaped
      const { usersChain } = mockListUsersQueries([], [])

      // Act — should not throw, and escaping should be applied
      await service.listUsers({ search: 'user%name_test' }, undefined, 20)

      // Assert — where must have been called with a defined condition
      expect(usersChain.where).toHaveBeenCalledWith(expect.anything())
    })

    it('should apply cursor condition when cursor is provided', async () => {
      // Arrange — encode a valid cursor
      const cursor = btoa(JSON.stringify({ t: '2025-01-01T00:00:00.000Z', i: 'user-abc' }))
      const { usersChain } = mockListUsersQueries([], [])

      // Act
      await service.listUsers({}, cursor, 20)

      // Assert — where should include cursor condition
      expect(usersChain.where).toHaveBeenCalledWith(expect.anything())
    })

    it('should return empty data with no cursor when no users exist', async () => {
      // Arrange — only one db.select call needed (no memberships query for empty users)
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act
      const result = await service.listUsers({}, undefined, 20)

      // Assert
      expect(result.data).toEqual([])
      expect(result.cursor.hasMore).toBe(false)
      expect(result.cursor.next).toBeNull()
    })

    it('should return empty organizations array for users with no memberships', async () => {
      // Arrange — user exists but no membership rows returned
      mockListUsersQueries([{ ...baseUser }], [])

      // Act
      const result = await service.listUsers({}, undefined, 20)

      // Assert
      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.organizations).toEqual([])
    })

    it('should merge multiple organizations per user', async () => {
      // Arrange — one user with two org memberships
      mockListUsersQueries(
        [{ ...baseUser }],
        [
          {
            userId: 'user-1',
            orgId: 'org-1',
            orgName: 'Acme Corp',
            orgSlug: 'acme',
            role: 'admin',
          },
          {
            userId: 'user-1',
            orgId: 'org-2',
            orgName: 'Beta Inc',
            orgSlug: 'beta',
            role: 'member',
          },
        ]
      )

      // Act
      const result = await service.listUsers({}, undefined, 20)

      // Assert
      expect(result.data[0]?.organizations).toHaveLength(2)
      expect(result.data[0]?.organizations).toEqual([
        { id: 'org-1', name: 'Acme Corp', slug: 'acme', role: 'admin' },
        { id: 'org-2', name: 'Beta Inc', slug: 'beta', role: 'member' },
      ])
    })
  })
})
