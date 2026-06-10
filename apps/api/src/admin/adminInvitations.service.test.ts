import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditService } from '../audit/audit.service.js'
import { PG_UNIQUE_VIOLATION } from '../database/pgErrorCodes.js'
import { createChainMock } from './__test-utils__/createChainMock.js'
import { AdminInvitationsService } from './adminInvitations.service.js'
import { InvitationAlreadyPendingException } from './exceptions/invitationAlreadyPending.exception.js'
import { InvitationNotFoundException } from './exceptions/invitationNotFound.exception.js'
import { MemberAlreadyExistsException } from './exceptions/memberAlreadyExists.exception.js'
import { AdminRoleNotFoundException } from './exceptions/roleNotFound.exception.js'

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
  const service = new AdminInvitationsService(db as never, auditService, cls as never)
  return { service, db, auditService, cls }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminInvitationsService', () => {
  let service: AdminInvitationsService
  let db: ReturnType<typeof createMockDb>
  let auditService: AuditService

  beforeEach(() => {
    vi.restoreAllMocks()
    ;({ service, db, auditService } = createService())
  })

  // -----------------------------------------------------------------------
  // inviteMember
  // -----------------------------------------------------------------------
  describe('inviteMember', () => {
    it('should create invitation when role exists and no conflicts', async () => {
      // Arrange
      const roleChain = createChainMock([{ id: 'r-member', slug: 'member' }])
      const existingMemberChain = createChainMock([])
      const existingInvitationChain = createChainMock([])
      const invitation = {
        id: 'inv-1',
        email: 'new@example.com',
        role: 'member',
        status: 'pending',
      }
      const insertChain = createChainMock([invitation])

      db.select
        .mockReturnValueOnce(roleChain) // role lookup
        .mockReturnValueOnce(existingMemberChain) // existing member check
        .mockReturnValueOnce(existingInvitationChain) // existing invitation check
      db.insert.mockReturnValueOnce(insertChain)

      // Act
      const result = await service.inviteMember(
        'org-1',
        { email: 'new@example.com', roleId: 'r-member' },
        'actor-1'
      )

      // Assert
      expect(result).toEqual(invitation)
      expect(db.insert).toHaveBeenCalled()
    })

    it('should throw AdminRoleNotFoundException when role does not exist', async () => {
      // Arrange
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act & Assert
      await expect(
        service.inviteMember('org-1', { email: 'new@example.com', roleId: 'r-invalid' }, 'actor-1')
      ).rejects.toThrow(AdminRoleNotFoundException)
    })

    it('should throw MemberAlreadyExistsException when member already in org', async () => {
      // Arrange
      db.select
        .mockReturnValueOnce(createChainMock([{ id: 'r-member', slug: 'member' }])) // role exists
        .mockReturnValueOnce(createChainMock([{ id: 'm-existing' }])) // member exists

      // Act & Assert
      await expect(
        service.inviteMember(
          'org-1',
          { email: 'existing@example.com', roleId: 'r-member' },
          'actor-1'
        )
      ).rejects.toThrow(MemberAlreadyExistsException)
    })

    it('should throw InvitationAlreadyPendingException when pending invitation exists', async () => {
      // Arrange
      db.select
        .mockReturnValueOnce(createChainMock([{ id: 'r-member', slug: 'member' }])) // role exists
        .mockReturnValueOnce(createChainMock([])) // no existing member
        .mockReturnValueOnce(createChainMock([{ id: 'inv-existing' }])) // pending invitation

      // Act & Assert
      await expect(
        service.inviteMember(
          'org-1',
          { email: 'pending@example.com', roleId: 'r-member' },
          'actor-1'
        )
      ).rejects.toThrow(InvitationAlreadyPendingException)
    })

    it('should use empty string as resourceId when insert returns no rows', async () => {
      // Arrange -- insert returns empty array so `invitation` is undefined
      db.select
        .mockReturnValueOnce(createChainMock([{ id: 'r-member', slug: 'member' }]))
        .mockReturnValueOnce(createChainMock([]))
        .mockReturnValueOnce(createChainMock([]))
      db.insert.mockReturnValueOnce(createChainMock([]))

      // Act
      await service.inviteMember(
        'org-1',
        { email: 'new@example.com', roleId: 'r-member' },
        'actor-1'
      )

      // Assert -- resourceId falls back to ''
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ resourceId: '' }))
    })

    it('should not throw when auditService.log rejects (fire-and-forget)', async () => {
      // Arrange
      const invitation = {
        id: 'inv-1',
        email: 'new@example.com',
        role: 'member',
        status: 'pending',
      }
      db.select
        .mockReturnValueOnce(createChainMock([{ id: 'r-member', slug: 'member' }]))
        .mockReturnValueOnce(createChainMock([]))
        .mockReturnValueOnce(createChainMock([]))
      db.insert.mockReturnValueOnce(createChainMock([invitation]))
      vi.mocked(auditService.log).mockRejectedValue(new Error('audit down'))

      // Act & Assert -- should resolve without throwing
      await expect(
        service.inviteMember('org-1', { email: 'new@example.com', roleId: 'r-member' }, 'actor-1')
      ).resolves.toBeDefined()

      // Flush microtasks so the .catch() handler runs
      await new Promise<void>((resolve) => queueMicrotask(resolve))
    })

    it('should call auditService.log after creating invitation', async () => {
      // Arrange
      const invitation = {
        id: 'inv-1',
        email: 'new@example.com',
        role: 'member',
        status: 'pending',
      }
      db.select
        .mockReturnValueOnce(createChainMock([{ id: 'r-member', slug: 'member' }]))
        .mockReturnValueOnce(createChainMock([]))
        .mockReturnValueOnce(createChainMock([]))
      db.insert.mockReturnValueOnce(createChainMock([invitation]))

      // Act
      await service.inviteMember(
        'org-1',
        { email: 'new@example.com', roleId: 'r-member' },
        'actor-1'
      )

      // Assert
      expect(auditService.log).toHaveBeenCalledWith({
        actorId: 'actor-1',
        actorType: 'user',
        organizationId: 'org-1',
        action: 'member.invited',
        resource: 'invitation',
        resourceId: 'inv-1',
        after: {
          email: 'new@example.com',
          roleId: 'r-member',
          roleSlug: 'member',
        },
      })
    })
  })

  // -----------------------------------------------------------------------
  // listPendingInvitations
  // -----------------------------------------------------------------------
  describe('listPendingInvitations', () => {
    it('should return pending invitations wrapped in data', async () => {
      // Arrange
      const rows = [
        {
          id: 'inv-1',
          email: 'a@example.com',
          role: 'member',
          status: 'pending',
          expiresAt: new Date(),
        },
        {
          id: 'inv-2',
          email: 'b@example.com',
          role: 'admin',
          status: 'pending',
          expiresAt: new Date(),
        },
      ]
      db.select.mockReturnValueOnce(createChainMock(rows))

      // Act
      const result = await service.listPendingInvitations('org-1')

      // Assert
      expect(result).toEqual({ data: rows })
      expect(db.select).toHaveBeenCalledTimes(1)
    })

    it('should return empty data array when no pending invitations exist', async () => {
      // Arrange
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act
      const result = await service.listPendingInvitations('org-1')

      // Assert
      expect(result).toEqual({ data: [] })
    })
  })

  // -----------------------------------------------------------------------
  // revokeInvitation
  // -----------------------------------------------------------------------
  describe('revokeInvitation', () => {
    it('should delete invitation and return revoked:true', async () => {
      // Arrange
      const invRow = { id: 'inv-1', email: 'a@example.com', organizationId: 'org-1' }
      db.select.mockReturnValueOnce(createChainMock([invRow]))
      db.delete.mockReturnValueOnce(createChainMock(undefined))

      // Act
      const result = await service.revokeInvitation('inv-1', 'org-1', 'actor-1')

      // Assert
      expect(result).toEqual({ revoked: true })
      expect(db.delete).toHaveBeenCalled()
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invitation.revoked',
          resourceId: 'inv-1',
          before: { email: 'a@example.com' },
        })
      )
    })

    it('should throw InvitationNotFoundException when invitation is not found', async () => {
      // Arrange
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act & Assert
      await expect(service.revokeInvitation('inv-missing', 'org-1', 'actor-1')).rejects.toThrow(
        InvitationNotFoundException
      )
      expect(db.delete).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // handleInviteConstraintViolation (via insertOrReuseInvitation path)
  // -----------------------------------------------------------------------
  describe('handleInviteConstraintViolation', () => {
    it('should re-throw when error is not a PG unique violation', async () => {
      // Arrange
      db.select
        .mockReturnValueOnce(createChainMock([{ id: 'r-member', slug: 'member' }]))
        .mockReturnValueOnce(createChainMock([]))
        .mockReturnValueOnce(createChainMock([]))

      const nonPgError = new Error('some other db error')
      const insertChain = createChainMock([])
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock to simulate rejection
      insertChain.then = (_resolve: unknown, reject: (e: unknown) => void) => reject(nonPgError)
      db.insert.mockReturnValueOnce(insertChain)

      // Act & Assert
      await expect(
        service.inviteMember('org-1', { email: 'x@example.com', roleId: 'r-member' }, 'actor-1')
      ).rejects.toThrow('some other db error')
    })

    it('should re-throw when code is 23505 but constraint_name does not match', async () => {
      // Arrange
      db.select
        .mockReturnValueOnce(createChainMock([{ id: 'r-member', slug: 'member' }]))
        .mockReturnValueOnce(createChainMock([]))
        .mockReturnValueOnce(createChainMock([]))

      const pgError = Object.assign(new Error('wrong constraint'), {
        code: PG_UNIQUE_VIOLATION,
        constraint_name: 'some_other_unique',
      })
      const insertChain = createChainMock([])
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock to simulate rejection
      insertChain.then = (_resolve: unknown, reject: (e: unknown) => void) => reject(pgError)
      db.insert.mockReturnValueOnce(insertChain)

      // Act & Assert
      await expect(
        service.inviteMember('org-1', { email: 'x@example.com', roleId: 'r-member' }, 'actor-1')
      ).rejects.toThrow('wrong constraint')
    })

    it('should throw InvitationAlreadyPendingException when existing invitation is pending', async () => {
      // Arrange
      db.select
        .mockReturnValueOnce(createChainMock([{ id: 'r-member', slug: 'member' }]))
        .mockReturnValueOnce(createChainMock([]))
        .mockReturnValueOnce(createChainMock([]))
        // constraint violation lookup — finds pending invitation
        .mockReturnValueOnce(createChainMock([{ id: 'inv-existing', status: 'pending' }]))

      const pgError = Object.assign(new Error('unique violation'), {
        code: PG_UNIQUE_VIOLATION,
        constraint_name: 'invitations_org_email_unique',
      })
      const insertChain = createChainMock([])
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock to simulate rejection
      insertChain.then = (_resolve: unknown, reject: (e: unknown) => void) => reject(pgError)
      db.insert.mockReturnValueOnce(insertChain)

      // Act & Assert
      await expect(
        service.inviteMember('org-1', { email: 'x@example.com', roleId: 'r-member' }, 'actor-1')
      ).rejects.toThrow(InvitationAlreadyPendingException)
    })

    it('should update non-pending invitation to pending and return it', async () => {
      // Arrange
      const updatedInvitation = {
        id: 'inv-old',
        status: 'pending',
        email: 'x@example.com',
        role: 'member',
      }
      db.select
        .mockReturnValueOnce(createChainMock([{ id: 'r-member', slug: 'member' }]))
        .mockReturnValueOnce(createChainMock([]))
        .mockReturnValueOnce(createChainMock([]))
        // constraint violation lookup — finds expired invitation
        .mockReturnValueOnce(createChainMock([{ id: 'inv-old', status: 'expired' }]))

      const pgError = Object.assign(new Error('unique violation'), {
        code: PG_UNIQUE_VIOLATION,
        constraint_name: 'invitations_org_email_unique',
      })
      const insertChain = createChainMock([])
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock to simulate rejection
      insertChain.then = (_resolve: unknown, reject: (e: unknown) => void) => reject(pgError)
      db.insert.mockReturnValueOnce(insertChain)
      db.update.mockReturnValueOnce(createChainMock([updatedInvitation]))

      // Act
      const result = await service.inviteMember(
        'org-1',
        { email: 'x@example.com', roleId: 'r-member' },
        'actor-1'
      )

      // Assert
      expect(result).toEqual(updatedInvitation)
      expect(db.update).toHaveBeenCalled()
    })

    it('should re-throw when constraint violation but no matching row found', async () => {
      // Arrange
      db.select
        .mockReturnValueOnce(createChainMock([{ id: 'r-member', slug: 'member' }]))
        .mockReturnValueOnce(createChainMock([]))
        .mockReturnValueOnce(createChainMock([]))
        // constraint violation lookup — no row found
        .mockReturnValueOnce(createChainMock([]))

      const pgError = Object.assign(new Error('unique violation'), {
        code: PG_UNIQUE_VIOLATION,
        constraint_name: 'invitations_org_email_unique',
      })
      const insertChain = createChainMock([])
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock to simulate rejection
      insertChain.then = (_resolve: unknown, reject: (e: unknown) => void) => reject(pgError)
      db.insert.mockReturnValueOnce(insertChain)

      // Act & Assert
      await expect(
        service.inviteMember('org-1', { email: 'x@example.com', roleId: 'r-member' }, 'actor-1')
      ).rejects.toThrow('unique violation')
    })
  })
})
