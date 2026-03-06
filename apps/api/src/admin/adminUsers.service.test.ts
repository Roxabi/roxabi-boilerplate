import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditService } from '../audit/audit.service.js'
import { createChainMock } from './__test-utils__/createChainMock.js'
import { AdminUsersService } from './adminUsers.service.js'
import { EmailConflictException } from './exceptions/emailConflict.exception.js'
import { LastSuperadminException } from './exceptions/lastSuperadmin.exception.js'
import { SuperadminProtectionException } from './exceptions/superadminProtection.exception.js'
import { AdminUserNotFoundException } from './exceptions/userNotFound.exception.js'

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
 * that has its own select/update/delete chain mocks.
 */
function mockTransaction(db: ReturnType<typeof createMockDb>) {
  const txSelect = vi.fn()
  const txUpdate = vi.fn()
  const txDelete = vi.fn()
  const txExecute = vi.fn().mockResolvedValue(undefined)
  const tx = {
    select: txSelect,
    insert: vi.fn(),
    update: txUpdate,
    delete: txDelete,
    execute: txExecute,
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
  const service = new AdminUsersService(db as never, auditService, cls as never)
  return { service, db, auditService, cls }
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

describe('AdminUsersService', () => {
  let service: AdminUsersService
  let db: ReturnType<typeof createMockDb>
  let auditService: AuditService

  beforeEach(() => {
    vi.restoreAllMocks()
    ;({ service, db, auditService } = createService())
  })

  // -----------------------------------------------------------------------
  // getUserDetail
  // -----------------------------------------------------------------------
  describe('getUserDetail', () => {
    it('should return user profile with org memberships and last 10 audit entries', async () => {
      // Arrange
      const userRow = { ...baseUser }
      const membershipRows = [
        {
          memberId: 'm-1',
          orgId: 'org-1',
          orgName: 'Acme Corp',
          role: 'admin',
          joinedAt: new Date('2024-06-01'),
        },
      ]
      const auditRows = [
        {
          id: 'log-1',
          timestamp: new Date('2025-01-10'),
          actorId: 'user-1',
          actorType: 'user',
          action: 'user.updated',
          resource: 'user',
          resourceId: 'user-1',
          before: null,
          after: null,
          metadata: null,
        },
      ]

      // getUserDetail makes 3 queries: user lookup, memberships, audit entries
      db.select
        .mockReturnValueOnce(createChainMock([userRow])) // user profile
        .mockReturnValueOnce(createChainMock(membershipRows)) // org memberships
        .mockReturnValueOnce(createChainMock(auditRows)) // audit entries

      // Act
      const result = await service.getUserDetail('user-1')

      // Assert — flat shape after #8 fix
      expect(result).toBeDefined()
      expect(result.id).toBe('user-1')
      expect(result.organizations).toBeDefined()
      expect(result.activitySummary).toBeDefined()
    })

    it('should limit audit entries to last 10', async () => {
      // Arrange
      db.select
        .mockReturnValueOnce(createChainMock([baseUser]))
        .mockReturnValueOnce(createChainMock([]))
        .mockReturnValueOnce(createChainMock([]))

      // Act
      await service.getUserDetail('user-1')

      // Assert — the audit query chain must have been called with limit(10)
      // The third select chain is for audit entries
      const auditChain = db.select.mock.results[2]?.value
      expect(auditChain?.limit).toHaveBeenCalledWith(10)
    })

    it('should include audit entries where resourceId=userId AND resource=user OR actorId=userId', async () => {
      // Arrange
      db.select
        .mockReturnValueOnce(createChainMock([baseUser]))
        .mockReturnValueOnce(createChainMock([]))
        .mockReturnValueOnce(createChainMock([]))

      // Act
      await service.getUserDetail('user-1')

      // Assert — the audit query must use an OR condition via where()
      const auditChain = db.select.mock.results[2]?.value
      expect(auditChain?.where).toHaveBeenCalled()
    })

    it('should throw AdminUserNotFoundException when user is not found', async () => {
      // Arrange — first select returns empty (user not found)
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act & Assert
      await expect(service.getUserDetail('user-missing')).rejects.toThrow(
        AdminUserNotFoundException
      )
    })

    it('should return empty memberships when user belongs to no organizations', async () => {
      // Arrange
      db.select
        .mockReturnValueOnce(createChainMock([baseUser]))
        .mockReturnValueOnce(createChainMock([])) // no memberships
        .mockReturnValueOnce(createChainMock([])) // no audit entries

      // Act
      const result = await service.getUserDetail('user-1')

      // Assert
      expect(result.organizations).toEqual([])
    })

    it('should return isLastActiveSuperadmin=true when user is the only active superadmin', async () => {
      // Arrange — user is a superadmin
      const superadminUser = { ...baseUser, role: 'superadmin' }
      db.select
        .mockReturnValueOnce(createChainMock([superadminUser])) // user profile
        .mockReturnValueOnce(createChainMock([])) // memberships
        .mockReturnValueOnce(createChainMock([])) // audit entries
        .mockReturnValueOnce(createChainMock([{ count: 0 }])) // count of other active superadmins

      // Act
      const result = await service.getUserDetail('user-1')

      // Assert
      expect(result.isLastActiveSuperadmin).toBe(true)
    })

    it('should return isLastActiveSuperadmin=false when other active superadmins exist', async () => {
      // Arrange
      const superadminUser = { ...baseUser, role: 'superadmin' }
      db.select
        .mockReturnValueOnce(createChainMock([superadminUser])) // user profile
        .mockReturnValueOnce(createChainMock([])) // memberships
        .mockReturnValueOnce(createChainMock([])) // audit entries
        .mockReturnValueOnce(createChainMock([{ count: 2 }])) // other active superadmins

      // Act
      const result = await service.getUserDetail('user-1')

      // Assert
      expect(result.isLastActiveSuperadmin).toBe(false)
    })

    it('should return isLastActiveSuperadmin=false for non-superadmin users', async () => {
      // Arrange — user is a regular user, no superadmin count query needed
      db.select
        .mockReturnValueOnce(createChainMock([baseUser])) // user profile (role: 'user')
        .mockReturnValueOnce(createChainMock([])) // memberships
        .mockReturnValueOnce(createChainMock([])) // audit entries

      // Act
      const result = await service.getUserDetail('user-1')

      // Assert
      expect(result.isLastActiveSuperadmin).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // updateUser
  // -----------------------------------------------------------------------
  describe('updateUser', () => {
    it('should update name, email, and role and return the updated user', async () => {
      // Arrange — non-self path now uses a serializable transaction (M3 fix)
      const beforeUser = { ...baseUser }
      const updatedUser = {
        ...baseUser,
        name: 'Alice Updated',
        email: 'alice-new@example.com',
        role: 'superadmin',
      }

      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([beforeUser]))
      tx.update.mockReturnValueOnce(createChainMock([updatedUser]))

      // Act
      const result = await service.updateUser(
        'user-1',
        { name: 'Alice Updated', email: 'alice-new@example.com', role: 'superadmin' },
        'actor-super'
      )

      // Assert
      expect(result).toBeDefined()
      expect(tx.update).toHaveBeenCalled()
    })

    it('should record before and after snapshots in the audit log', async () => {
      // Arrange
      const beforeUser = { ...baseUser }
      const updatedUser = { ...baseUser, name: 'New Name' }

      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([beforeUser]))
      tx.update.mockReturnValueOnce(createChainMock([updatedUser]))

      // Act
      await service.updateUser('user-1', { name: 'New Name' }, 'actor-super')

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.updated',
          resource: 'user',
          resourceId: 'user-1',
          actorId: 'actor-super',
          before: expect.objectContaining({ name: 'Alice Admin' }),
          after: expect.objectContaining({ name: 'New Name' }),
        })
      )
    })

    it('should throw AdminUserNotFoundException when user does not exist', async () => {
      // Arrange
      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([]))

      // Act & Assert
      await expect(
        service.updateUser('user-missing', { name: 'New Name' }, 'actor-super')
      ).rejects.toThrow(AdminUserNotFoundException)
    })

    it('should throw EmailConflictException on duplicate email (pg error 23505)', async () => {
      // Arrange — user exists, but update throws a unique constraint violation inside the tx
      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([baseUser]))
      const pgError = { code: '23505', constraint_name: 'users_email_unique' }
      const updateChain = createChainMock([])
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock to simulate pg rejection
      updateChain.then = (_resolve: unknown, reject: (e: unknown) => void) => reject(pgError)
      tx.update.mockReturnValueOnce(updateChain)

      // Act & Assert
      await expect(
        service.updateUser('user-1', { email: 'taken@example.com' }, 'actor-super')
      ).rejects.toThrow(EmailConflictException)
    })

    it('should rethrow unknown errors that are not 23505', async () => {
      // Arrange
      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([baseUser]))
      const unknownError = new Error('DB connection lost')
      const updateChain = createChainMock([])
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock to simulate pg rejection
      updateChain.then = (_resolve: unknown, reject: (e: unknown) => void) => reject(unknownError)
      tx.update.mockReturnValueOnce(updateChain)

      // Act & Assert
      await expect(service.updateUser('user-1', { name: 'X' }, 'actor-super')).rejects.toThrow(
        'DB connection lost'
      )
    })

    it('should not call auditService.log when user is not found', async () => {
      // Arrange
      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([]))

      // Act
      await service.updateUser('user-missing', { name: 'X' }, 'actor-super').catch(() => {})

      // Assert
      expect(auditService.log).not.toHaveBeenCalled()
    })

    it('should throw SuperadminProtectionException when changing a superadmin role to non-superadmin', async () => {
      // Arrange
      const superadminUser = { ...baseUser, role: 'superadmin' }
      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([superadminUser]))

      // Act & Assert
      await expect(service.updateUser('user-1', { role: 'user' }, 'actor-super')).rejects.toThrow(
        SuperadminProtectionException
      )
    })

    it('should use audit action user.role_changed when role is changed', async () => {
      // Arrange
      const beforeUser = { ...baseUser, role: 'user' }
      const updatedUser = { ...baseUser, role: 'superadmin' }

      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([beforeUser]))
      tx.update.mockReturnValueOnce(createChainMock([updatedUser]))

      // Act
      await service.updateUser('user-1', { role: 'superadmin' }, 'actor-super')

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.role_changed',
        })
      )
    })

    it('should use audit action user.updated when role is not changed', async () => {
      // Arrange
      const beforeUser = { ...baseUser, role: 'user' }
      const updatedUser = { ...baseUser, name: 'New Name', role: 'user' }

      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([beforeUser]))
      tx.update.mockReturnValueOnce(createChainMock([updatedUser]))

      // Act
      await service.updateUser('user-1', { name: 'New Name' }, 'actor-super')

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.updated',
        })
      )
    })

    it('should allow self-role-change when other active superadmins exist', async () => {
      // Arrange — self-role-change uses a transaction
      const beforeUser = { ...baseUser, id: 'actor-super', role: 'superadmin' }
      const updatedUser = { ...baseUser, id: 'actor-super', role: 'user' }

      const tx = mockTransaction(db)
      // Count query: 1 other active superadmin
      tx.select.mockReturnValueOnce(createChainMock([{ count: 1 }]))
      // Fetch before-user in tx
      tx.select.mockReturnValueOnce(createChainMock([beforeUser]))
      // Update returns updated user
      tx.update.mockReturnValueOnce(createChainMock([updatedUser]))
      // Delete sessions
      tx.delete.mockReturnValueOnce(createChainMock([]))

      // Act
      const result = await service.updateUser('actor-super', { role: 'user' }, 'actor-super')

      // Assert
      expect(result).toBeDefined()
      expect(db.transaction).toHaveBeenCalled()
      expect(tx.delete).toHaveBeenCalled()
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.role_changed',
          actorId: 'actor-super',
          resourceId: 'actor-super',
        })
      )
    })

    it('should throw LastSuperadminException when last active superadmin self-demotes', async () => {
      // Arrange — self-role-change, no other active superadmins
      const tx = mockTransaction(db)
      // Count query: 0 other active superadmins
      tx.select.mockReturnValueOnce(createChainMock([{ count: 0 }]))

      // Act & Assert
      await expect(
        service.updateUser('actor-super', { role: 'user' }, 'actor-super')
      ).rejects.toThrow(LastSuperadminException)
    })

    it('should invalidate all sessions after successful self-demotion', async () => {
      // Arrange
      const beforeUser = { ...baseUser, id: 'actor-super', role: 'superadmin' }
      const updatedUser = { ...baseUser, id: 'actor-super', role: 'user' }

      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([{ count: 1 }]))
      tx.select.mockReturnValueOnce(createChainMock([beforeUser]))
      tx.update.mockReturnValueOnce(createChainMock([updatedUser]))
      tx.delete.mockReturnValueOnce(createChainMock([]))

      // Act
      await service.updateUser('actor-super', { role: 'user' }, 'actor-super')

      // Assert — sessions deleted via tx.delete
      expect(tx.delete).toHaveBeenCalled()
    })

    it('should allow name/email self-update without confirmation for superadmin', async () => {
      // Arrange — no role change, just name update on own account.
      // isSelfRoleChange=false (no data.role), so goes through the non-self
      // path which uses a serializable transaction (M3 fix).
      const beforeUser = { ...baseUser, id: 'actor-super', role: 'superadmin' }
      const updatedUser = { ...beforeUser, name: 'New Name' }

      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([beforeUser]))
      tx.update.mockReturnValueOnce(createChainMock([updatedUser]))

      // Act
      const result = await service.updateUser('actor-super', { name: 'New Name' }, 'actor-super')

      // Assert — non-self path uses transaction; self-role-change path not triggered (no role change)
      expect(result).toBeDefined()
      expect(db.transaction).toHaveBeenCalledOnce()
    })

    it('should use serializable transaction for non-self update (M3 TOCTOU fix)', async () => {
      // Arrange
      const beforeUser = { ...baseUser }
      const updatedUser = { ...baseUser, name: 'New Name' }

      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([beforeUser]))
      tx.update.mockReturnValueOnce(createChainMock([updatedUser]))

      // Act
      await service.updateUser('user-1', { name: 'New Name' }, 'actor-super')

      // Assert — non-self path uses serializable transaction
      expect(db.transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ isolationLevel: 'serializable' })
      )
    })

    it('should use serializable transaction for self-role-change', async () => {
      // Arrange
      const beforeUser = { ...baseUser, id: 'actor-super', role: 'superadmin' }
      const updatedUser = { ...baseUser, id: 'actor-super', role: 'user' }

      const tx = mockTransaction(db)
      tx.select.mockReturnValueOnce(createChainMock([{ count: 1 }]))
      tx.select.mockReturnValueOnce(createChainMock([beforeUser]))
      tx.update.mockReturnValueOnce(createChainMock([updatedUser]))
      tx.delete.mockReturnValueOnce(createChainMock([]))

      // Act
      await service.updateUser('actor-super', { role: 'user' }, 'actor-super')

      // Assert — transaction started with serializable isolation level
      // (passed as second argument to db.transaction, not via tx.execute)
      expect(db.transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ isolationLevel: 'serializable' })
      )
    })

    it('should throw SuperadminProtectionException when non-superadmin attempts self-role-change', async () => {
      // Arrange — user with role 'user' tries to self-promote via self-role-change path
      // (blocked at controller by @Roles('superadmin'), defense-in-depth at service layer)
      const regularUser = { ...baseUser, id: 'user-1', role: 'user' }

      const tx = mockTransaction(db)
      // isLastActiveSuperadmin: count=1 so it passes through to the role guard
      tx.select.mockReturnValueOnce(createChainMock([{ count: 1 }]))
      // Fetch before-user in tx — returns non-superadmin user
      tx.select.mockReturnValueOnce(createChainMock([regularUser]))

      // Act & Assert
      await expect(service.updateUser('user-1', { role: 'superadmin' }, 'user-1')).rejects.toThrow(
        SuperadminProtectionException
      )
    })
  })
})
