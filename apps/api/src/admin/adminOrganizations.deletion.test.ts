import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditService } from '../audit/audit.service.js'
import { createChainMock } from './__test-utils__/createChainMock.js'
import { AdminOrganizationsDeletionService } from './adminOrganizations.deletion.js'
import { NotDeletedException } from './exceptions/notDeleted.exception.js'
import { AdminOrgNotFoundException } from './exceptions/orgNotFound.exception.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockDb() {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(async (fn: (tx: Record<string, unknown>) => unknown) =>
      fn({
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        execute: vi.fn(),
      })
    ),
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
 */
function createService() {
  const db = createMockDb()
  const auditService = createMockAuditService()
  const cls = createMockClsService()
  const service = new AdminOrganizationsDeletionService(db as never, auditService, cls as never)
  return { service, db, auditService, cls }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseOrg = {
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  parentOrganizationId: null,
  logo: null,
  metadata: null,
  deletedAt: null,
  deleteScheduledFor: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminOrganizationsDeletionService', () => {
  let service: AdminOrganizationsDeletionService
  let db: ReturnType<typeof createMockDb>
  let auditService: AuditService

  beforeEach(() => {
    vi.restoreAllMocks()
    ;({ service, db, auditService } = createService())
  })

  // -----------------------------------------------------------------------
  // getDeletionImpact
  // -----------------------------------------------------------------------
  describe('getDeletionImpact', () => {
    it('should return memberCount, activeMembers, childOrgCount, childMemberCount', async () => {
      // Arrange -- org exists, then impact queries
      db.select
        .mockReturnValueOnce(createChainMock([baseOrg])) // org lookup
        .mockReturnValueOnce(createChainMock([{ count: 10 }])) // member count
        .mockReturnValueOnce(createChainMock([{ count: 7 }])) // active members
        .mockReturnValueOnce(createChainMock([{ count: 3 }])) // child org count (direct)
        .mockReturnValueOnce(createChainMock([{ count: 25 }])) // child member count
      // getDescendantOrgIds (recursive CTE): 3 direct children
      db.execute.mockResolvedValueOnce([{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }])

      // Act
      const result = await service.getDeletionImpact('org-1')

      // Assert
      expect(result).toBeDefined()
      expect(result.memberCount).toBe(10)
      expect(result.activeMembers).toBe(7)
      expect(result.childOrgCount).toBe(3)
      expect(result.childMemberCount).toBe(25)
    })

    it('should throw AdminOrgNotFoundException when org not found', async () => {
      // Arrange
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act & Assert
      await expect(service.getDeletionImpact('org-missing')).rejects.toThrow(
        AdminOrgNotFoundException
      )
    })

    it('should return zeros when org has no members or children', async () => {
      // Arrange
      db.select
        .mockReturnValueOnce(createChainMock([baseOrg])) // org lookup
        .mockReturnValueOnce(createChainMock([{ count: 0 }])) // member count
        .mockReturnValueOnce(createChainMock([{ count: 0 }])) // active members
        .mockReturnValueOnce(createChainMock([{ count: 0 }])) // child org count
      // getDescendantOrgIds (recursive CTE): no children
      db.execute.mockResolvedValueOnce([])

      // Act
      const result = await service.getDeletionImpact('org-1')

      // Assert
      expect(result.memberCount).toBe(0)
      expect(result.activeMembers).toBe(0)
      expect(result.childOrgCount).toBe(0)
      expect(result.childMemberCount).toBe(0)
    })
  })

  // -----------------------------------------------------------------------
  // deleteOrganization
  // -----------------------------------------------------------------------
  describe('deleteOrganization', () => {
    it('should soft-delete by setting deletedAt and deleteScheduledFor', async () => {
      // Arrange
      const activeOrg = { ...baseOrg, deletedAt: null, deleteScheduledFor: null }
      const deletedOrg = {
        ...baseOrg,
        deletedAt: new Date(),
        deleteScheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }

      db.select.mockReturnValueOnce(createChainMock([activeOrg]))
      db.update.mockReturnValueOnce(createChainMock([deletedOrg]))

      // Act
      const result = await service.deleteOrganization('org-1', 'actor-super')

      // Assert
      expect(result).toBeDefined()
      expect(db.update).toHaveBeenCalled()
    })

    it('should throw AdminOrgNotFoundException when org not found', async () => {
      // Arrange
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act & Assert
      await expect(service.deleteOrganization('org-missing', 'actor-super')).rejects.toThrow(
        AdminOrgNotFoundException
      )
    })

    it('should call auditService.log with org.deleted action', async () => {
      // Arrange
      const activeOrg = { ...baseOrg }
      const deletedOrg = { ...baseOrg, deletedAt: new Date() }

      db.select.mockReturnValueOnce(createChainMock([activeOrg]))
      db.update.mockReturnValueOnce(createChainMock([deletedOrg]))

      // Act
      await service.deleteOrganization('org-1', 'actor-super')

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'org.deleted',
          resource: 'organization',
          resourceId: 'org-1',
          actorId: 'actor-super',
        })
      )
    })

    it('should not throw when auditService.log rejects (fire-and-forget)', async () => {
      // Arrange
      const activeOrg = { ...baseOrg }
      const deletedOrg = { ...baseOrg, deletedAt: new Date() }

      db.select.mockReturnValueOnce(createChainMock([activeOrg]))
      db.update.mockReturnValueOnce(createChainMock([deletedOrg]))
      vi.mocked(auditService.log).mockRejectedValue(new Error('audit service down'))

      // Act & Assert -- should resolve without throwing
      await expect(service.deleteOrganization('org-1', 'actor-super')).resolves.toBeDefined()

      // Flush microtasks so the .catch() handler runs
      await new Promise<void>((resolve) => queueMicrotask(resolve))
    })
  })

  // -----------------------------------------------------------------------
  // restoreOrganization
  // -----------------------------------------------------------------------
  describe('restoreOrganization', () => {
    it('should restore by clearing deletedAt and deleteScheduledFor', async () => {
      // Arrange
      const deletedOrg = {
        ...baseOrg,
        deletedAt: new Date('2025-06-01'),
        deleteScheduledFor: new Date('2025-07-01'),
      }
      const restoredOrg = { ...baseOrg, deletedAt: null, deleteScheduledFor: null }

      db.select.mockReturnValueOnce(createChainMock([deletedOrg]))
      db.update.mockReturnValueOnce(createChainMock([restoredOrg]))

      // Act
      const result = await service.restoreOrganization('org-1', 'actor-super')

      // Assert
      expect(result).toBeDefined()
      expect(db.update).toHaveBeenCalled()
    })

    it('should throw AdminOrgNotFoundException when org not found', async () => {
      // Arrange
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act & Assert
      await expect(service.restoreOrganization('org-missing', 'actor-super')).rejects.toThrow(
        AdminOrgNotFoundException
      )
    })

    it('should throw NotDeletedException when org is not deleted (deletedAt is null)', async () => {
      // Arrange -- org exists but deletedAt is null (not soft-deleted)
      const activeOrg = { ...baseOrg, deletedAt: null, deleteScheduledFor: null }
      db.select.mockReturnValueOnce(createChainMock([activeOrg]))

      // Act & Assert
      await expect(service.restoreOrganization('org-1', 'actor-super')).rejects.toThrow(
        NotDeletedException
      )
    })

    it('should call auditService.log with org.restored action', async () => {
      // Arrange
      const deletedOrg = {
        ...baseOrg,
        deletedAt: new Date('2025-06-01'),
        deleteScheduledFor: new Date('2025-07-01'),
      }
      const restoredOrg = { ...baseOrg, deletedAt: null, deleteScheduledFor: null }

      db.select.mockReturnValueOnce(createChainMock([deletedOrg]))
      db.update.mockReturnValueOnce(createChainMock([restoredOrg]))

      // Act
      await service.restoreOrganization('org-1', 'actor-super')

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'org.restored',
          resource: 'organization',
          resourceId: 'org-1',
          actorId: 'actor-super',
        })
      )
    })

    it('should not throw when auditService.log rejects (fire-and-forget)', async () => {
      // Arrange
      const deletedOrg = {
        ...baseOrg,
        deletedAt: new Date('2025-06-01'),
        deleteScheduledFor: new Date('2025-07-01'),
      }
      const restoredOrg = { ...baseOrg, deletedAt: null, deleteScheduledFor: null }

      db.select.mockReturnValueOnce(createChainMock([deletedOrg]))
      db.update.mockReturnValueOnce(createChainMock([restoredOrg]))
      vi.mocked(auditService.log).mockRejectedValue(new Error('audit service down'))

      // Act & Assert
      await expect(service.restoreOrganization('org-1', 'actor-super')).resolves.toBeDefined()

      // Flush microtasks
      await new Promise<void>((resolve) => queueMicrotask(resolve))
    })
  })
})
