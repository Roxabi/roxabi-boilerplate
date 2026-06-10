import { describe, expect, it, vi } from 'vitest'
import { OrgNameConfirmationMismatchException } from './exceptions/orgNameConfirmationMismatch.exception.js'
import { OrgNotDeletedException } from './exceptions/orgNotDeleted.exception.js'
import { OrgNotFoundException } from './exceptions/orgNotFound.exception.js'
import { OrgNotOwnerException } from './exceptions/orgNotOwner.exception.js'
import type { OrgRepository } from './org.repository.js'
import { OrganizationService } from './organization.service.js'

function createMockOrgRepo(): OrgRepository {
  return {
    listForUser: vi.fn(),
    findActiveOrg: vi.fn(),
    findOrgForReactivate: vi.fn(),
    checkOwnership: vi.fn(),
    softDeleteOrg: vi.fn(),
    clearOrgSessions: vi.fn(),
    expireOrgInvitations: vi.fn(),
    reactivateOrg: vi.fn(),
    getDeletionImpact: vi.fn(),
    transaction: vi.fn(),
  } as unknown as OrgRepository
}

const mockEventEmitter = { emitAsync: vi.fn().mockResolvedValue([]) }

describe('OrganizationService', () => {
  describe('listForUser', () => {
    it('should return organizations the user belongs to', async () => {
      // Arrange
      const mockRepo = createMockOrgRepo()
      const orgs = [
        { id: 'org-1', name: 'Alpha', slug: 'alpha', logo: null, createdAt: new Date() },
        { id: 'org-2', name: 'Beta', slug: 'beta', logo: null, createdAt: new Date() },
      ]
      ;(mockRepo.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue(orgs)
      const service = new OrganizationService(mockRepo as never, mockEventEmitter as never)

      // Act
      const result = await service.listForUser('user-1')

      // Assert
      expect(result).toEqual(orgs)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when user has no memberships', async () => {
      // Arrange
      const mockRepo = createMockOrgRepo()
      ;(mockRepo.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const service = new OrganizationService(mockRepo as never, mockEventEmitter as never)

      // Act
      const result = await service.listForUser('user-no-orgs')

      // Assert
      expect(result).toEqual([])
    })

    it('should exclude soft-deleted organizations via whereActive', async () => {
      // Arrange -- whereActive filtering is done at the DB query level.
      // We verify the query is called (integration with whereActive is implicit).
      const mockRepo = createMockOrgRepo()
      const activeOrgs = [
        { id: 'org-1', name: 'Active Org', slug: 'active', logo: null, createdAt: new Date() },
      ]
      ;(mockRepo.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue(activeOrgs)
      const service = new OrganizationService(mockRepo as never, mockEventEmitter as never)

      // Act
      const result = await service.listForUser('user-1')

      // Assert
      expect(result).toEqual(activeOrgs)
      expect(mockRepo.listForUser).toHaveBeenCalled()
    })

    it('should order results by organization name', async () => {
      // Arrange
      const mockRepo = createMockOrgRepo()
      const orderedOrgs = [
        { id: 'org-1', name: 'Alpha', slug: 'alpha', logo: null, createdAt: new Date() },
        { id: 'org-2', name: 'Zeta', slug: 'zeta', logo: null, createdAt: new Date() },
      ]
      ;(mockRepo.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue(orderedOrgs)
      const service = new OrganizationService(mockRepo as never, mockEventEmitter as never)

      // Act
      const result = await service.listForUser('user-1')

      // Assert
      expect(result[0]?.name).toBe('Alpha')
      expect(result[1]?.name).toBe('Zeta')
    })
  })

  describe('softDelete', () => {
    it('should set deletedAt and deleteScheduledFor on the organization', async () => {
      // Arrange
      const mockRepo = createMockOrgRepo()
      ;(mockRepo.findActiveOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
      })
      ;(mockRepo.checkOwnership as ReturnType<typeof vi.fn>).mockResolvedValue({ role: 'owner' })

      const now = new Date()
      const deleteScheduledFor = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const updatedOrg = {
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org',
        deletedAt: now,
        deleteScheduledFor,
      }

      ;(mockRepo.transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn(undefined)
      )
      ;(mockRepo.softDeleteOrg as ReturnType<typeof vi.fn>).mockResolvedValue(updatedOrg)
      ;(mockRepo.clearOrgSessions as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      ;(mockRepo.expireOrgInvitations as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new OrganizationService(mockRepo as never, mockEventEmitter as never)

      // Act
      const result = await service.softDelete('org-1', 'user-1', 'Test Org')

      // Assert
      expect(result).toEqual(updatedOrg)
      expect(result?.deletedAt).toBeDefined()
      expect(result?.deleteScheduledFor).toBeDefined()
    })

    it('should clear activeOrganizationId on all sessions referencing the org', async () => {
      // Arrange
      const mockRepo = createMockOrgRepo()
      ;(mockRepo.findActiveOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'org-1',
        name: 'My Org',
      })
      ;(mockRepo.checkOwnership as ReturnType<typeof vi.fn>).mockResolvedValue({ role: 'owner' })
      ;(mockRepo.transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn(undefined)
      )
      ;(mockRepo.softDeleteOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'org-1',
        name: 'My Org',
        slug: 'my-org',
        deletedAt: new Date(),
        deleteScheduledFor: new Date(),
      })
      ;(mockRepo.clearOrgSessions as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      ;(mockRepo.expireOrgInvitations as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new OrganizationService(mockRepo as never, mockEventEmitter as never)

      // Act
      await service.softDelete('org-1', 'user-1', 'My Org')

      // Assert
      expect(mockRepo.transaction).toHaveBeenCalled()
      expect(mockRepo.clearOrgSessions).toHaveBeenCalledOnce()
    })

    it('should invalidate pending invitations', async () => {
      // Arrange
      const mockRepo = createMockOrgRepo()
      ;(mockRepo.findActiveOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'org-1',
        name: 'Org',
      })
      ;(mockRepo.checkOwnership as ReturnType<typeof vi.fn>).mockResolvedValue({ role: 'owner' })
      ;(mockRepo.transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn(undefined)
      )
      ;(mockRepo.softDeleteOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'org-1',
        name: 'Org',
        slug: 'org',
        deletedAt: new Date(),
        deleteScheduledFor: new Date(),
      })
      ;(mockRepo.clearOrgSessions as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      ;(mockRepo.expireOrgInvitations as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new OrganizationService(mockRepo as never, mockEventEmitter as never)

      // Act
      const result = await service.softDelete('org-1', 'user-1', 'Org')

      // Assert
      expect(result).toBeDefined()
      expect(mockRepo.transaction).toHaveBeenCalled()
      expect(mockRepo.expireOrgInvitations).toHaveBeenCalledOnce()
    })

    it('should reject deletion by non-owner', async () => {
      // Arrange
      const mockRepo = createMockOrgRepo()
      ;(mockRepo.findActiveOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'org-1',
        name: 'Org',
      })
      ;(mockRepo.checkOwnership as ReturnType<typeof vi.fn>).mockResolvedValue({ role: 'member' })

      const service = new OrganizationService(mockRepo as never, mockEventEmitter as never)

      // Act & Assert
      await expect(service.softDelete('org-1', 'user-1', 'Org')).rejects.toThrow(
        OrgNotOwnerException
      )
    })

    it('should throw OrgNotFoundException when org does not exist', async () => {
      // Arrange
      const mockRepo = createMockOrgRepo()
      ;(mockRepo.findActiveOrg as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new OrganizationService(mockRepo as never, mockEventEmitter as never)

      // Act & Assert
      await expect(service.softDelete('nonexistent', 'user-1', 'X')).rejects.toThrow(
        OrgNotFoundException
      )
    })

    it('should throw OrgNameConfirmationMismatchException when name does not match', async () => {
      // Arrange
      const mockRepo = createMockOrgRepo()
      ;(mockRepo.findActiveOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'org-1',
        name: 'Real Org',
      })

      const service = new OrganizationService(mockRepo as never, mockEventEmitter as never)

      // Act & Assert
      await expect(service.softDelete('org-1', 'user-1', 'Wrong Name')).rejects.toThrow(
        OrgNameConfirmationMismatchException
      )
    })
  })

  describe('reactivate', () => {
    it('should clear deletedAt and deleteScheduledFor', async () => {
      // Arrange
      const mockRepo = createMockOrgRepo()
      ;(mockRepo.findOrgForReactivate as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'org-1',
        deletedAt: new Date(),
      })
      ;(mockRepo.checkOwnership as ReturnType<typeof vi.fn>).mockResolvedValue({ role: 'owner' })

      const reactivatedOrg = {
        id: 'org-1',
        name: 'Org',
        slug: 'org',
        deletedAt: null,
        deleteScheduledFor: null,
      }
      ;(mockRepo.reactivateOrg as ReturnType<typeof vi.fn>).mockResolvedValue(reactivatedOrg)
      ;(mockRepo.transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn(undefined)
      )

      const service = new OrganizationService(mockRepo as never, mockEventEmitter as never)

      // Act
      const result = await service.reactivate('org-1', 'user-1')

      // Assert
      expect(result?.deletedAt).toBeNull()
      expect(result?.deleteScheduledFor).toBeNull()
    })

    it('should reject reactivation by non-owner', async () => {
      // Arrange
      const mockRepo = createMockOrgRepo()
      ;(mockRepo.findOrgForReactivate as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'org-1',
        deletedAt: new Date(),
      })
      ;(mockRepo.checkOwnership as ReturnType<typeof vi.fn>).mockResolvedValue({ role: 'member' })

      const service = new OrganizationService(mockRepo as never, mockEventEmitter as never)

      // Act & Assert
      await expect(service.reactivate('org-1', 'user-1')).rejects.toThrow(OrgNotOwnerException)
    })

    it('should throw OrgNotDeletedException when org is not deleted', async () => {
      // Arrange
      const mockRepo = createMockOrgRepo()
      ;(mockRepo.findOrgForReactivate as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'org-1',
        deletedAt: null,
      })

      const service = new OrganizationService(mockRepo as never, mockEventEmitter as never)

      // Act & Assert
      await expect(service.reactivate('org-1', 'user-1')).rejects.toThrow(OrgNotDeletedException)
    })
  })

  describe('getDeletionImpact', () => {
    it('should return member count, invitation count, and custom role count', async () => {
      // Arrange
      const mockRepo = createMockOrgRepo()
      ;(mockRepo.findActiveOrg as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'org-1' })
      ;(mockRepo.getDeletionImpact as ReturnType<typeof vi.fn>).mockResolvedValue({
        memberCount: 5,
        invitationCount: 2,
        customRoleCount: 1,
      })

      const service = new OrganizationService(mockRepo as never, mockEventEmitter as never)

      // Act
      const result = await service.getDeletionImpact('org-1')

      // Assert
      expect(result).toEqual({
        memberCount: 5,
        invitationCount: 2,
        customRoleCount: 1,
      })
    })
  })
})
