import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChainMock } from '../__test-utils__/createChainMock.js'
import { AdminUsersQueryService } from '../adminUsers.query.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockDb() {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}

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
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
}

/**
 * Test shells for #312 — Users list columns (Orgs count + Last Active).
 * Spec: artifacts/specs/312-313-admin-users-columns-org-membership-editing.mdx
 *
 * listUsers uses a three-query approach:
 *   Query 1: user rows
 *   Query 2: batch memberships by userId
 *   Query 3: batch lastActive by userId (MAX(timestamp) from audit_logs)
 */
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: test describe block with multiple test cases
describe('AdminUsersQueryService — listUsers columns (#312)', () => {
  let service: AdminUsersQueryService
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    vi.restoreAllMocks()
    ;({ service, db } = createService())
  })

  /**
   * Helper: mock db.select for the three-query listUsers pattern.
   * Query 1 returns user rows, Query 2 returns membership rows,
   * Query 3 returns lastActive rows.
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

  // SC: /admin/users table shows "Orgs" column with count badge for each user.
  // Users in 0 orgs show "0".
  it('should return organizationCount derived from memberships for each user', async () => {
    // Arrange — user-1 has 2 memberships, user-2 has 0 memberships
    const user1 = { ...baseUser, id: 'user-1' }
    const user2 = { ...baseUser, id: 'user-2', email: 'bob@example.com' }

    mockListUsersQueries(
      [user1, user2],
      [
        { userId: 'user-1', orgId: 'org-1', orgName: 'Acme', orgSlug: 'acme', role: 'admin' },
        { userId: 'user-1', orgId: 'org-2', orgName: 'Beta', orgSlug: 'beta', role: 'member' },
      ],
      []
    )

    // Act
    const result = await service.listUsers({}, undefined, 20)

    // Assert
    expect(result.data).toHaveLength(2)
    expect(result.data[0]?.organizationCount).toBe(2)
    expect(result.data[1]?.organizationCount).toBe(0)
  })

  // SC: /admin/users table shows "Last Active" column with relative timestamp.
  // Uses MAX(timestamp) from audit_logs grouped by actorId.
  it('should return lastActive ISO timestamp from batch audit query', async () => {
    // Arrange — user-1 has audit entry, user-2 has a different timestamp
    const user1 = { ...baseUser, id: 'user-1' }
    const user2 = { ...baseUser, id: 'user-2', email: 'bob@example.com' }

    const lastActiveDate1 = new Date('2026-02-20T14:30:00.000Z')
    const lastActiveDate2 = new Date('2026-01-15T09:00:00.000Z')

    mockListUsersQueries(
      [user1, user2],
      [],
      [
        { actorId: 'user-1', lastActive: lastActiveDate1 },
        { actorId: 'user-2', lastActive: lastActiveDate2 },
      ]
    )

    // Act
    const result = await service.listUsers({}, undefined, 20)

    // Assert
    expect(result.data).toHaveLength(2)
    expect(result.data[0]?.lastActive).toBe('2026-02-20T14:30:00.000Z')
    expect(result.data[1]?.lastActive).toBe('2026-01-15T09:00:00.000Z')
  })

  // SC: Users with no audit activity show "Never" (null lastActive).
  it('should return null lastActive for users with no audit entries', async () => {
    // Arrange — user exists but has no audit log entries
    mockListUsersQueries([{ ...baseUser }], [], [])

    // Act
    const result = await service.listUsers({}, undefined, 20)

    // Assert
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.lastActive).toBeNull()
  })
})
