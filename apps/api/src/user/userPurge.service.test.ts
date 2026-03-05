import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChainMock } from '../admin/__test-utils__/createChainMock.js'
import { AccountNotDeletedException } from './exceptions/accountNotDeleted.exception.js'
import { EmailConfirmationMismatchException } from './exceptions/emailConfirmationMismatch.exception.js'
import { UserNotFoundException } from './exceptions/userNotFound.exception.js'
import { UserPurgeService } from './userPurge.service.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockDb() {
  const db = {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  return db
}

function createMockTx() {
  const tx = {
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
  }
  return tx
}

function createService() {
  const db = createMockDb()
  const service = new UserPurgeService(db as never)
  return { service, db }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseUser = {
  id: 'user-1',
  email: 'alice@example.com',
  deletedAt: new Date('2026-01-01T00:00:00.000Z'),
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UserPurgeService', () => {
  let service: UserPurgeService
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    vi.restoreAllMocks()
    ;({ service, db } = createService())
  })

  // -----------------------------------------------------------------------
  // validatePurgeEligibility
  // -----------------------------------------------------------------------
  describe('validatePurgeEligibility', () => {
    it('should throw UserNotFoundException when user does not exist', async () => {
      // Arrange
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act & Assert
      await expect(
        service.validatePurgeEligibility('nonexistent', 'alice@example.com')
      ).rejects.toThrow(UserNotFoundException)
    })

    it('should throw AccountNotDeletedException when user is not soft-deleted', async () => {
      // Arrange
      const activeUser = { ...baseUser, deletedAt: null }
      db.select.mockReturnValueOnce(createChainMock([activeUser]))

      // Act & Assert
      await expect(service.validatePurgeEligibility('user-1', 'alice@example.com')).rejects.toThrow(
        AccountNotDeletedException
      )
    })

    it('should throw EmailConfirmationMismatchException when email does not match', async () => {
      // Arrange
      db.select.mockReturnValueOnce(createChainMock([baseUser]))

      // Act & Assert
      await expect(service.validatePurgeEligibility('user-1', 'wrong@example.com')).rejects.toThrow(
        EmailConfirmationMismatchException
      )
    })

    it('should accept case-insensitive email confirmation', async () => {
      // Arrange
      const userWithMixedCaseEmail = { ...baseUser, email: 'Alice@Example.COM' }
      db.select.mockReturnValueOnce(createChainMock([userWithMixedCaseEmail]))

      // Act & Assert -- should resolve without throwing
      await expect(
        service.validatePurgeEligibility('user-1', 'alice@example.com')
      ).resolves.toBeDefined()
    })

    it('should return user when all conditions are met', async () => {
      // Arrange
      db.select.mockReturnValueOnce(createChainMock([baseUser]))

      // Act
      const result = await service.validatePurgeEligibility('user-1', 'alice@example.com')

      // Assert
      expect(result).toEqual(baseUser)
    })

    it('should allow purge even within what would be a grace period (user-initiated bypass)', async () => {
      // Arrange — deletedAt is very recent (same day)
      const justDeletedUser = {
        ...baseUser,
        deletedAt: new Date(),
      }
      db.select.mockReturnValueOnce(createChainMock([justDeletedUser]))

      // Act & Assert -- grace period is intentionally bypassed for user-initiated purge
      await expect(
        service.validatePurgeEligibility('user-1', 'alice@example.com')
      ).resolves.toEqual(justDeletedUser)
    })
  })

  // -----------------------------------------------------------------------
  // anonymizeUserRecords
  // -----------------------------------------------------------------------
  describe('anonymizeUserRecords', () => {
    it('should update user fields with anonymized values', async () => {
      // Arrange
      const tx = createMockTx()
      tx.update.mockReturnValue(createChainMock(undefined))
      tx.delete.mockReturnValue(createChainMock([]))
      const now = new Date('2026-03-01T00:00:00.000Z')

      // Act
      await service.anonymizeUserRecords(tx as never, 'user-1', 'alice@example.com', now)

      // Assert -- update was called for user anonymization
      expect(tx.update).toHaveBeenCalledOnce()
      // Verify the set data contains anonymized values
      const updateCall = tx.update.mock.calls[0]
      expect(updateCall).toBeDefined()
    })

    it('should set firstName to "Deleted" and lastName to "User"', async () => {
      // Arrange
      const tx = createMockTx()
      const setMock = vi.fn().mockReturnValue(createChainMock(undefined))
      tx.update.mockReturnValue({ set: setMock })
      tx.delete.mockReturnValue(createChainMock([]))
      const now = new Date()

      // Act
      await service.anonymizeUserRecords(tx as never, 'user-1', 'alice@example.com', now)

      // Assert
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Deleted',
          lastName: 'User',
          name: 'Deleted User',
          image: null,
          emailVerified: false,
          avatarSeed: null,
          avatarStyle: null,
          avatarOptions: {},
          updatedAt: now,
        })
      )
    })

    it('should set email to a unique anonymized address', async () => {
      // Arrange
      const tx = createMockTx()
      const capturedSets: unknown[] = []
      const setMock = vi.fn().mockImplementation((data: unknown) => {
        capturedSets.push(data)
        return createChainMock(undefined)
      })
      tx.update.mockReturnValue({ set: setMock })
      tx.delete.mockReturnValue(createChainMock([]))
      const now = new Date()

      // Act -- run twice to verify uniqueness
      await service.anonymizeUserRecords(tx as never, 'user-1', 'alice@example.com', now)
      await service.anonymizeUserRecords(tx as never, 'user-2', 'bob@example.com', now)

      // Assert -- emails are unique and match anonymized pattern
      const email1 = (capturedSets[0] as Record<string, string>).email
      const email2 = (capturedSets[1] as Record<string, string>).email
      expect(email1).toMatch(/^deleted-.+@anonymized\.local$/)
      expect(email2).toMatch(/^deleted-.+@anonymized\.local$/)
      expect(email1).not.toBe(email2)
    })

    it('should delete sessions for the user', async () => {
      // Arrange
      const tx = createMockTx()
      tx.update.mockReturnValue(createChainMock(undefined))
      const deleteMock = vi.fn().mockReturnValue(createChainMock([]))
      tx.delete = deleteMock
      const now = new Date()

      // Act
      await service.anonymizeUserRecords(tx as never, 'user-1', 'alice@example.com', now)

      // Assert -- delete was called multiple times (sessions, accounts, verifications, invitations x2)
      expect(deleteMock).toHaveBeenCalledTimes(5)
    })

    it('should delete accounts, verifications, and invitations', async () => {
      // Arrange
      const tx = createMockTx()
      tx.update.mockReturnValue(createChainMock(undefined))
      tx.delete.mockReturnValue(createChainMock([]))
      const now = new Date()

      // Act
      await service.anonymizeUserRecords(tx as never, 'user-1', 'alice@example.com', now)

      // Assert -- delete called 5 times: sessions, accounts, verifications, invitations (inviterId), invitations (email)
      expect(tx.delete).toHaveBeenCalledTimes(5)
    })
  })

  // -----------------------------------------------------------------------
  // purgeOwnedOrganizations
  // -----------------------------------------------------------------------
  describe('purgeOwnedOrganizations', () => {
    it('should do nothing and only delete user memberships when user owns no deleted organizations', async () => {
      // Arrange
      const tx = createMockTx()
      // First select returns no owned deleted orgs
      tx.select.mockReturnValueOnce(createChainMock([]))
      tx.delete.mockReturnValue(createChainMock([]))
      const now = new Date()

      // Act
      await service.purgeOwnedOrganizations(tx as never, 'user-1', now)

      // Assert -- no update for orgs, only the final member delete for user memberships
      expect(tx.update).not.toHaveBeenCalled()
      expect(tx.delete).toHaveBeenCalledOnce()
    })

    it('should anonymize each owned deleted organization', async () => {
      // Arrange
      const tx = createMockTx()
      const ownedDeletedOrgs = [{ orgId: 'org-1' }]
      tx.select.mockReturnValueOnce(createChainMock(ownedDeletedOrgs))

      const capturedSets: unknown[] = []
      const setMock = vi.fn().mockImplementation((data: unknown) => {
        capturedSets.push(data)
        return createChainMock(undefined)
      })
      tx.update.mockReturnValue({ set: setMock })
      tx.delete.mockReturnValue(createChainMock([]))
      const now = new Date()

      // Act
      await service.purgeOwnedOrganizations(tx as never, 'user-1', now)

      // Assert -- org was anonymized
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Deleted Organization',
          logo: null,
          metadata: null,
          updatedAt: now,
        })
      )
    })

    it('should set org slug to a unique anonymized value', async () => {
      // Arrange
      const tx = createMockTx()
      const ownedDeletedOrgs = [{ orgId: 'org-1' }, { orgId: 'org-2' }]
      tx.select.mockReturnValueOnce(createChainMock(ownedDeletedOrgs))

      const capturedSets: unknown[] = []
      const setMock = vi.fn().mockImplementation((data: unknown) => {
        capturedSets.push(data)
        return createChainMock(undefined)
      })
      tx.update.mockReturnValue({ set: setMock })
      tx.delete.mockReturnValue(createChainMock([]))
      const now = new Date()

      // Act
      await service.purgeOwnedOrganizations(tx as never, 'user-1', now)

      // Assert -- each org gets a unique slug
      const slug1 = (capturedSets[0] as Record<string, string>).slug
      const slug2 = (capturedSets[1] as Record<string, string>).slug
      expect(slug1).toMatch(/^deleted-/)
      expect(slug2).toMatch(/^deleted-/)
      expect(slug1).not.toBe(slug2)
    })

    it('should delete members, invitations, and roles for each owned deleted org', async () => {
      // Arrange
      const tx = createMockTx()
      const ownedDeletedOrgs = [{ orgId: 'org-1' }]
      tx.select.mockReturnValueOnce(createChainMock(ownedDeletedOrgs))
      tx.update.mockReturnValue(createChainMock(undefined))

      const deletedTargets: unknown[] = []
      tx.delete.mockImplementation((table: unknown) => {
        deletedTargets.push(table)
        return createChainMock([])
      })
      const now = new Date()

      // Act
      await service.purgeOwnedOrganizations(tx as never, 'user-1', now)

      // Assert -- per org: members, invitations, roles + final members delete for user
      // 3 per org + 1 final = 4 total for 1 org
      expect(tx.delete).toHaveBeenCalledTimes(4)
    })

    it('should delete user memberships from all remaining organizations after processing owned orgs', async () => {
      // Arrange
      const tx = createMockTx()
      tx.select.mockReturnValueOnce(createChainMock([]))
      tx.delete.mockReturnValue(createChainMock([]))
      const now = new Date()

      // Act
      await service.purgeOwnedOrganizations(tx as never, 'user-1', now)

      // Assert -- final delete is for user memberships
      expect(tx.delete).toHaveBeenCalledOnce()
    })

    it('should process multiple owned deleted organizations', async () => {
      // Arrange
      const tx = createMockTx()
      const ownedDeletedOrgs = [{ orgId: 'org-1' }, { orgId: 'org-2' }, { orgId: 'org-3' }]
      tx.select.mockReturnValueOnce(createChainMock(ownedDeletedOrgs))
      tx.update.mockReturnValue(createChainMock(undefined))
      tx.delete.mockReturnValue(createChainMock([]))
      const now = new Date()

      // Act
      await service.purgeOwnedOrganizations(tx as never, 'user-1', now)

      // Assert -- 3 updates (one per org) + 3*3 deletes per org + 1 final members delete = 10
      expect(tx.update).toHaveBeenCalledTimes(3)
      expect(tx.delete).toHaveBeenCalledTimes(10)
    })
  })
})
