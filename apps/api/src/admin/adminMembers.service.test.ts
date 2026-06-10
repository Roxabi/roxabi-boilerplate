import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditService } from '../audit/audit.service.js'
import { createChainMock } from './__test-utils__/createChainMock.js'
import { AdminMembersService } from './adminMembers.service.js'
import { LastOwnerConstraintException } from './exceptions/lastOwnerConstraint.exception.js'
import { AdminMemberNotFoundException } from './exceptions/memberNotFound.exception.js'
import { AdminRoleNotFoundException } from './exceptions/roleNotFound.exception.js'
import { SelfRemovalException } from './exceptions/selfRemoval.exception.js'
import { SelfRoleChangeException } from './exceptions/selfRoleChange.exception.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockDb() {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  }
}

/**
 * Helper to mock db.transaction() -- executes the callback with a tx mock
 * that has its own select/update chain mocks. Returns the tx so tests
 * can configure per-call return values on tx.select / tx.update.
 */
function mockTransaction(db: ReturnType<typeof createMockDb>) {
  const txSelect = vi.fn()
  const txUpdate = vi.fn()
  const tx = {
    select: txSelect,
    insert: vi.fn(),
    update: txUpdate,
    delete: vi.fn(),
  }
  db.transaction.mockImplementationOnce(async (fn: (tx: Record<string, unknown>) => unknown) =>
    fn(tx)
  )
  return tx
}

function createMockAuditService(): AuditService {
  return { log: vi.fn().mockResolvedValue(undefined) } as unknown as AuditService
}

function createMockClsService(id = 'test-correlation-id') {
  return { getId: vi.fn().mockReturnValue(id) }
}

/**
 * Instantiate the service with fresh mocks.
 * Returns the service and its mock collaborators so tests can configure
 * per-call return values.
 */
function createService() {
  const db = createMockDb()
  const auditService = createMockAuditService()
  const cls = createMockClsService()
  const service = new AdminMembersService(db as never, auditService, cls as never)
  return { service, db, auditService, cls }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminMembersService', () => {
  let service: AdminMembersService
  let db: ReturnType<typeof createMockDb>
  let auditService: AuditService

  beforeEach(() => {
    vi.restoreAllMocks()
    ;({ service, db, auditService } = createService())
  })

  // -----------------------------------------------------------------------
  // listMembers
  // -----------------------------------------------------------------------
  describe('listMembers', () => {
    it('should return paginated member data with user and role details', async () => {
      // Arrange
      const orgId = 'org-1'
      const memberRow = {
        id: 'm-1',
        userId: 'u-1',
        role: 'admin',
        roleId: 'r-1',
        createdAt: new Date('2025-01-01'),
        userName: 'Alice',
        userEmail: 'alice@example.com',
        userImage: 'https://img.example.com/alice.png',
        roleName: 'Admin',
        roleSlug: 'admin',
      }
      const memberChain = createChainMock([memberRow])
      const countChain = createChainMock([{ count: 1 }])

      // The service calls db.select() twice via Promise.all:
      //   1) member rows query
      //   2) count query
      db.select.mockReturnValueOnce(memberChain).mockReturnValueOnce(countChain)

      // Act
      const result = await service.listMembers(orgId, { page: 1, limit: 20 })

      // Assert
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({
        id: 'm-1',
        userId: 'u-1',
        role: 'admin',
        roleId: 'r-1',
        createdAt: new Date('2025-01-01'),
        user: {
          name: 'Alice',
          email: 'alice@example.com',
          image: 'https://img.example.com/alice.png',
        },
        roleDetails: { name: 'Admin', slug: 'admin' },
      })
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      })
    })

    it('should return null roleDetails when role is not joined', async () => {
      // Arrange
      const memberRow = {
        id: 'm-2',
        userId: 'u-2',
        role: 'member',
        roleId: null,
        createdAt: new Date('2025-06-01'),
        userName: 'Bob',
        userEmail: 'bob@example.com',
        userImage: null,
        roleName: null,
        roleSlug: null,
      }
      db.select
        .mockReturnValueOnce(createChainMock([memberRow]))
        .mockReturnValueOnce(createChainMock([{ count: 1 }]))

      // Act
      const result = await service.listMembers('org-1', { page: 1, limit: 20 })

      // Assert
      expect(result.data[0]?.roleDetails).toBeNull()
    })

    it('should handle empty results when no members exist', async () => {
      // Arrange
      db.select
        .mockReturnValueOnce(createChainMock([]))
        .mockReturnValueOnce(createChainMock([{ count: 0 }]))

      // Act
      const result = await service.listMembers('org-1', { page: 1, limit: 20 })

      // Assert
      expect(result.data).toEqual([])
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      })
    })

    it('should calculate correct offset from page and limit', async () => {
      // Arrange
      const memberChain = createChainMock([])
      const countChain = createChainMock([{ count: 0 }])
      db.select.mockReturnValueOnce(memberChain).mockReturnValueOnce(countChain)

      // Act
      await service.listMembers('org-1', { page: 3, limit: 10 })

      // Assert -- offset should be (3-1)*10 = 20
      expect(memberChain.offset).toHaveBeenCalledWith(20)
    })
  })

  // -----------------------------------------------------------------------
  // changeMemberRole
  // -----------------------------------------------------------------------
  describe('changeMemberRole', () => {
    it('should update role and legacy role field successfully', async () => {
      // Arrange -- single joined query returns member with current role info
      const newRole = { id: 'r-admin', slug: 'admin', name: 'Admin' }
      const memberWithRole = {
        id: 'm-1',
        userId: 'u-1',
        role: 'member',
        roleId: 'r-member',
        currentRoleSlug: 'member',
        currentRoleName: 'Member',
      }

      db.select
        .mockReturnValueOnce(createChainMock([newRole])) // target role
        .mockReturnValueOnce(createChainMock([memberWithRole])) // member + current role (joined)

      // Guard + update run inside a transaction
      const tx = mockTransaction(db)
      tx.update.mockReturnValueOnce(createChainMock(undefined))

      // Act
      const result = await service.changeMemberRole(
        'm-1',
        'org-1',
        { roleId: 'r-admin' },
        'actor-1'
      )

      // Assert
      expect(result).toEqual({ updated: true })
      expect(db.transaction).toHaveBeenCalled()
      expect(tx.update).toHaveBeenCalled()
    })

    it('should throw AdminRoleNotFoundException when target role does not exist', async () => {
      // Arrange
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act & Assert
      await expect(
        service.changeMemberRole('m-1', 'org-1', { roleId: 'r-invalid' }, 'actor-1')
      ).rejects.toThrow(AdminRoleNotFoundException)
    })

    it('should throw AdminMemberNotFoundException when member not found', async () => {
      // Arrange
      db.select
        .mockReturnValueOnce(createChainMock([{ id: 'r-admin', slug: 'admin', name: 'Admin' }]))
        .mockReturnValueOnce(createChainMock([])) // member not found

      // Act & Assert
      await expect(
        service.changeMemberRole('m-missing', 'org-1', { roleId: 'r-admin' }, 'actor-1')
      ).rejects.toThrow(AdminMemberNotFoundException)
    })

    it('should call auditService.log with before and after snapshots', async () => {
      // Arrange
      const newRole = { id: 'r-admin', slug: 'admin', name: 'Admin' }
      const memberWithRole = {
        id: 'm-1',
        userId: 'u-1',
        role: 'member',
        roleId: 'r-member',
        currentRoleSlug: 'member',
        currentRoleName: 'Member',
      }

      db.select
        .mockReturnValueOnce(createChainMock([newRole]))
        .mockReturnValueOnce(createChainMock([memberWithRole]))
      const tx = mockTransaction(db)
      tx.update.mockReturnValueOnce(createChainMock(undefined))

      // Act
      await service.changeMemberRole('m-1', 'org-1', { roleId: 'r-admin' }, 'actor-1')

      // Assert
      expect(auditService.log).toHaveBeenCalledWith({
        actorId: 'actor-1',
        actorType: 'user',
        organizationId: 'org-1',
        action: 'member.role_changed',
        resource: 'member',
        resourceId: 'm-1',
        before: {
          roleId: 'r-member',
          roleSlug: 'member',
          roleName: 'Member',
        },
        after: {
          roleId: 'r-admin',
          roleSlug: 'admin',
          roleName: 'Admin',
        },
      })
    })

    it('should set null before role info when left join returns no role', async () => {
      // Arrange -- member has roleId but role row is missing from DB (left join returns null)
      const newRole = { id: 'r-admin', slug: 'admin', name: 'Admin' }
      const memberWithRole = {
        id: 'm-1',
        userId: 'u-1',
        role: 'member',
        roleId: 'r-deleted',
        currentRoleSlug: null,
        currentRoleName: null,
      }

      db.select
        .mockReturnValueOnce(createChainMock([newRole]))
        .mockReturnValueOnce(createChainMock([memberWithRole]))
      const tx = mockTransaction(db)
      tx.update.mockReturnValueOnce(createChainMock(undefined))

      // Act
      await service.changeMemberRole('m-1', 'org-1', { roleId: 'r-admin' }, 'actor-1')

      // Assert -- before role slug/name are null from the left join
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          before: {
            roleId: 'r-deleted',
            roleSlug: null,
            roleName: null,
          },
        })
      )
    })

    it('should set null before role info when member has no current roleId', async () => {
      // Arrange
      const newRole = { id: 'r-admin', slug: 'admin', name: 'Admin' }
      const memberWithRole = {
        id: 'm-1',
        userId: 'u-1',
        role: 'member',
        roleId: null,
        currentRoleSlug: null,
        currentRoleName: null,
      }

      db.select
        .mockReturnValueOnce(createChainMock([newRole]))
        .mockReturnValueOnce(createChainMock([memberWithRole]))
      const tx = mockTransaction(db)
      tx.update.mockReturnValueOnce(createChainMock(undefined))

      // Act
      await service.changeMemberRole('m-1', 'org-1', { roleId: 'r-admin' }, 'actor-1')

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          before: {
            roleId: null,
            roleSlug: null,
            roleName: null,
          },
        })
      )
    })

    it('should throw SelfRoleChangeException when actor changes their own role', async () => {
      // Arrange -- member.userId matches actorId
      const newRole = { id: 'r-admin', slug: 'admin', name: 'Admin' }
      const memberWithRole = {
        id: 'm-1',
        userId: 'actor-1',
        role: 'member',
        roleId: 'r-member',
        currentRoleSlug: 'member',
        currentRoleName: 'Member',
      }

      db.select
        .mockReturnValueOnce(createChainMock([newRole])) // target role
        .mockReturnValueOnce(createChainMock([memberWithRole])) // member is the actor

      // Act & Assert
      await expect(
        service.changeMemberRole('m-1', 'org-1', { roleId: 'r-admin' }, 'actor-1')
      ).rejects.toThrow(SelfRoleChangeException)

      // Should not have called update
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should short-circuit when new roleId equals current roleId', async () => {
      // Arrange -- member already has the target role
      const newRole = { id: 'r-member', slug: 'member', name: 'Member' }
      const memberWithRole = {
        id: 'm-1',
        userId: 'u-1',
        role: 'member',
        roleId: 'r-member',
        currentRoleSlug: 'member',
        currentRoleName: 'Member',
      }

      db.select
        .mockReturnValueOnce(createChainMock([newRole])) // target role
        .mockReturnValueOnce(createChainMock([memberWithRole])) // member already has same role

      // Act
      const result = await service.changeMemberRole(
        'm-1',
        'org-1',
        { roleId: 'r-member' },
        'actor-1'
      )

      // Assert -- returns early without UPDATE or audit log
      expect(result).toEqual({ updated: true })
      expect(db.update).not.toHaveBeenCalled()
      expect(auditService.log).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // removeMember
  // -----------------------------------------------------------------------
  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: test describe block with multiple test cases
  describe('removeMember', () => {
    it('should remove member successfully when not last owner', async () => {
      // Arrange -- joined query returns member with role slug
      const member = {
        id: 'm-1',
        userId: 'u-1',
        role: 'admin',
        roleId: 'r-admin',
        roleSlug: 'admin',
      }

      db.select.mockReturnValueOnce(createChainMock([member])) // member + role (joined)
      const tx = mockTransaction(db)
      tx.delete.mockReturnValueOnce(createChainMock(undefined))

      // Act
      const result = await service.removeMember('m-1', 'org-1', 'actor-1')

      // Assert
      expect(result).toEqual({ removed: true })
      expect(tx.delete).toHaveBeenCalled()
    })

    it('should remove member successfully when member has no roleId', async () => {
      // Arrange
      const member = {
        id: 'm-1',
        userId: 'u-1',
        role: 'member',
        roleId: null,
        roleSlug: null,
      }

      db.select.mockReturnValueOnce(createChainMock([member]))
      db.delete.mockReturnValueOnce(createChainMock(undefined))

      // Act
      const result = await service.removeMember('m-1', 'org-1', 'actor-1')

      // Assert
      expect(result).toEqual({ removed: true })
    })

    it('should throw AdminMemberNotFoundException when member not found', async () => {
      // Arrange
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act & Assert
      await expect(service.removeMember('m-missing', 'org-1', 'actor-1')).rejects.toThrow(
        AdminMemberNotFoundException
      )
    })

    it('should throw SelfRemovalException when actor removes themselves', async () => {
      // Arrange -- member.userId matches actorId
      const member = {
        id: 'm-1',
        userId: 'actor-1',
        role: 'admin',
        roleId: 'r-admin',
        roleSlug: 'admin',
      }

      db.select.mockReturnValueOnce(createChainMock([member]))

      // Act & Assert
      await expect(service.removeMember('m-1', 'org-1', 'actor-1')).rejects.toThrow(
        SelfRemovalException
      )
    })

    it('should throw LastOwnerConstraintException when removing last owner', async () => {
      // Arrange
      const member = {
        id: 'm-1',
        userId: 'u-1',
        role: 'owner',
        roleId: 'r-owner',
        roleSlug: 'owner',
      }
      const ownerCount = { count: 1 }

      db.select.mockReturnValueOnce(createChainMock([member])) // member + role (joined)
      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([ownerCount])) // only 1 owner

      // Act & Assert
      await expect(service.removeMember('m-1', 'org-1', 'actor-1')).rejects.toThrow(
        LastOwnerConstraintException
      )
    })

    it('should throw LastOwnerConstraintException when owner count query returns empty', async () => {
      // Arrange -- count query returns [] so ownerCount is undefined -> fallback 0 <= 1
      const member = {
        id: 'm-1',
        userId: 'u-1',
        role: 'owner',
        roleId: 'r-owner',
        roleSlug: 'owner',
      }

      db.select.mockReturnValueOnce(createChainMock([member]))
      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([])) // empty count result

      // Act & Assert
      await expect(service.removeMember('m-1', 'org-1', 'actor-1')).rejects.toThrow(
        LastOwnerConstraintException
      )
    })

    it('should allow removing owner when other owners exist', async () => {
      // Arrange
      const member = {
        id: 'm-1',
        userId: 'u-1',
        role: 'owner',
        roleId: 'r-owner',
        roleSlug: 'owner',
      }
      const ownerCount = { count: 3 }

      db.select
        .mockReturnValueOnce(createChainMock([member]))
        .mockReturnValueOnce(createChainMock([ownerCount]))
      db.delete.mockReturnValueOnce(createChainMock(undefined))

      // Act
      const result = await service.removeMember('m-1', 'org-1', 'actor-1')

      // Assert
      expect(result).toEqual({ removed: true })
    })

    it('should call auditService.log after removal', async () => {
      // Arrange
      const member = {
        id: 'm-1',
        userId: 'u-1',
        role: 'admin',
        roleId: 'r-admin',
        roleSlug: 'admin',
      }

      db.select.mockReturnValueOnce(createChainMock([member]))
      db.delete.mockReturnValueOnce(createChainMock(undefined))

      // Act
      await service.removeMember('m-1', 'org-1', 'actor-1')

      // Assert
      expect(auditService.log).toHaveBeenCalledWith({
        actorId: 'actor-1',
        actorType: 'user',
        organizationId: 'org-1',
        action: 'member.removed',
        resource: 'member',
        resourceId: 'm-1',
        before: {
          userId: 'u-1',
          role: 'admin',
          roleId: 'r-admin',
        },
      })
    })

    it('should call auditService.log with roleId: null in metadata when member has no role', async () => {
      // Arrange
      const member = {
        id: 'm-1',
        userId: 'u-1',
        role: 'member',
        roleId: null,
        roleSlug: null,
      }

      db.select.mockReturnValueOnce(createChainMock([member]))
      db.delete.mockReturnValueOnce(createChainMock(undefined))

      // Act
      await service.removeMember('m-1', 'org-1', 'actor-1')

      // Assert
      expect(auditService.log).toHaveBeenCalledWith({
        actorId: 'actor-1',
        actorType: 'user',
        organizationId: 'org-1',
        action: 'member.removed',
        resource: 'member',
        resourceId: 'm-1',
        before: {
          userId: 'u-1',
          role: 'member',
          roleId: null,
        },
      })
    })

    it('should delete via tx with org-scoped WHERE (Fix #1: includes organizationId)', async () => {
      // Arrange -- non-owner member so ensureNotLastOwner is a no-op
      const member = {
        id: 'm-1',
        userId: 'u-1',
        role: 'admin',
        roleId: 'r-admin',
        roleSlug: 'admin',
      }

      db.select.mockReturnValueOnce(createChainMock([member]))
      const tx = mockTransaction(db)
      tx.delete.mockReturnValueOnce(createChainMock(undefined))

      // Act
      await service.removeMember('m-1', 'org-1', 'actor-1')

      // Assert — delete must be called on tx (not db) so it runs inside the transaction
      expect(tx.delete).toHaveBeenCalled()
      // db.delete must NOT have been called directly (would bypass org scope guard)
      expect(db.delete).not.toHaveBeenCalled()
    })

    it('should throw LastOwnerConstraintException when removing owner with null roleId (Fix #2)', async () => {
      // Arrange — owner identified by role field only (roleId is null, roleSlug is null)
      // This exercises the isNull(members.roleId) branch in ensureNotLastOwner
      const member = {
        id: 'm-1',
        userId: 'u-1',
        role: 'owner',
        roleId: null,
        roleSlug: null,
      }

      db.select.mockReturnValueOnce(createChainMock([member]))
      const tx = mockTransaction(db)
      // count query returns 1 → last owner
      tx.select.mockReturnValueOnce(createChainMock([{ count: 1 }]))

      // Act & Assert
      await expect(service.removeMember('m-1', 'org-1', 'actor-1')).rejects.toThrow(
        LastOwnerConstraintException
      )
    })
  })
})
