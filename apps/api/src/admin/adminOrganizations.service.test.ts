import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditService } from '../audit/audit.service.js'
import { createChainMock } from './__test-utils__/createChainMock.js'
import { AdminOrganizationsQueryService } from './adminOrganizations.query.js'
import { AdminOrganizationsService } from './adminOrganizations.service.js'
import { OrgCycleDetectedException } from './exceptions/orgCycleDetected.exception.js'
import { OrgDepthExceededException } from './exceptions/orgDepthExceeded.exception.js'
import { AdminOrgNotFoundException } from './exceptions/orgNotFound.exception.js'
import { OrgSlugConflictException } from './exceptions/orgSlugConflict.exception.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockDb() {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(async (fn: (tx: Record<string, unknown>) => unknown) =>
      fn({
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
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
 * Instantiate AdminOrganizationsService with fresh mocks.
 */
function createService() {
  const db = createMockDb()
  const auditService = createMockAuditService()
  const cls = createMockClsService()
  const service = new AdminOrganizationsService(db as never, auditService, cls as never)
  return { service, db, auditService, cls }
}

/**
 * Instantiate AdminOrganizationsQueryService with fresh mocks.
 */
function createQueryService() {
  const db = createMockDb()
  const service = new AdminOrganizationsQueryService(db as never)
  return { service, db }
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

describe('AdminOrganizationsService', () => {
  let service: AdminOrganizationsService
  let db: ReturnType<typeof createMockDb>
  let auditService: AuditService

  beforeEach(() => {
    vi.restoreAllMocks()
    ;({ service, db, auditService } = createService())
  })

  // -----------------------------------------------------------------------
  // getOrganizationDetail
  // -----------------------------------------------------------------------
  describe('getOrganizationDetail', () => {
    it('should return org detail with members and child orgs', async () => {
      // Arrange
      const orgRow = { ...baseOrg }
      const memberRows = [
        {
          memberId: 'm-1',
          userId: 'user-1',
          userName: 'Alice',
          email: 'alice@example.com',
          role: 'owner',
          joinedAt: new Date('2024-06-01'),
        },
      ]
      const childRows = [
        { id: 'org-child-1', name: 'Child Org', slug: 'child-org', parentOrganizationId: 'org-1' },
      ]

      // getOrganizationDetail makes 3 queries: org lookup, members, children
      db.select
        .mockReturnValueOnce(createChainMock([orgRow])) // org detail
        .mockReturnValueOnce(createChainMock(memberRows)) // members
        .mockReturnValueOnce(createChainMock(childRows)) // children

      // Act
      const result = await service.getOrganizationDetail('org-1')

      // Assert — response is flat (org fields spread at top level)
      expect(result).toBeDefined()
      expect(result.id).toBe('org-1')
      expect(result.name).toBe('Acme Corp')
      expect(result.members).toBeDefined()
      expect(result.children).toBeDefined()
      expect(result.parentOrganization).toBeNull()
    })

    it('should throw AdminOrgNotFoundException when org not found', async () => {
      // Arrange -- first select returns empty (org not found)
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act & Assert
      await expect(service.getOrganizationDetail('org-missing')).rejects.toThrow(
        AdminOrgNotFoundException
      )
    })

    it('should return empty members and children when none exist', async () => {
      // Arrange
      db.select
        .mockReturnValueOnce(createChainMock([baseOrg])) // org found
        .mockReturnValueOnce(createChainMock([])) // no members
        .mockReturnValueOnce(createChainMock([])) // no children

      // Act
      const result = await service.getOrganizationDetail('org-1')

      // Assert
      expect(result.members).toEqual([])
      expect(result.children).toEqual([])
    })
  })

  // -----------------------------------------------------------------------
  // createOrganization
  // -----------------------------------------------------------------------
  describe('createOrganization', () => {
    it('should create org with no parent (parentOrganizationId null)', async () => {
      // Arrange
      const createdOrg = { ...baseOrg, id: 'org-new' }
      db.insert.mockReturnValueOnce(createChainMock([createdOrg]))

      // Act
      const result = await service.createOrganization(
        { name: 'New Org', slug: 'new-org' },
        'actor-super'
      )

      // Assert
      expect(result).toBeDefined()
      expect(db.insert).toHaveBeenCalled()
    })

    it('should create org with valid parent', async () => {
      // Arrange -- parent exists at depth 0 (root)
      const parentOrg = { ...baseOrg, id: 'org-parent', parentOrganizationId: null }
      db.select.mockReturnValueOnce(createChainMock([parentOrg]))

      const createdOrg = { ...baseOrg, id: 'org-new', parentOrganizationId: 'org-parent' }
      db.insert.mockReturnValueOnce(createChainMock([createdOrg]))

      // Act
      const result = await service.createOrganization(
        { name: 'Child Org', slug: 'child-org', parentOrganizationId: 'org-parent' },
        'actor-super'
      )

      // Assert
      expect(result).toBeDefined()
    })

    it('should throw OrgDepthExceededException when parent depth would exceed 3', async () => {
      // Arrange -- mock parent chain: grandparent -> parent -> org (depth 2)
      // Adding a child here would make depth 3 which exceeds the max
      const grandparent = { ...baseOrg, id: 'org-gp', parentOrganizationId: null }
      const parent = { ...baseOrg, id: 'org-parent', parentOrganizationId: 'org-gp' }
      const deepParent = { ...baseOrg, id: 'org-deep', parentOrganizationId: 'org-parent' }

      // Walk-up queries: deep parent -> parent -> grandparent -> root (null parent)
      db.select
        .mockReturnValueOnce(createChainMock([deepParent]))
        .mockReturnValueOnce(createChainMock([parent]))
        .mockReturnValueOnce(createChainMock([grandparent]))

      // Act & Assert
      await expect(
        service.createOrganization(
          { name: 'Too Deep', slug: 'too-deep', parentOrganizationId: 'org-deep' },
          'actor-super'
        )
      ).rejects.toThrow(OrgDepthExceededException)
    })

    it('should throw OrgSlugConflictException on pg error 23505', async () => {
      // Arrange -- insert throws a unique constraint violation
      const pgError = { code: '23505', constraint_name: 'organizations_slug_unique' }
      const insertChain = createChainMock([])
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock to simulate pg rejection
      insertChain.then = (_resolve: unknown, reject: (e: unknown) => void) => reject(pgError)
      db.insert.mockReturnValueOnce(insertChain)

      // Act & Assert
      await expect(
        service.createOrganization({ name: 'Duplicate', slug: 'acme-corp' }, 'actor-super')
      ).rejects.toThrow(OrgSlugConflictException)
    })

    it('should call auditService.log with org.created action', async () => {
      // Arrange
      const createdOrg = { ...baseOrg, id: 'org-new' }
      db.insert.mockReturnValueOnce(createChainMock([createdOrg]))

      // Act
      await service.createOrganization({ name: 'New Org', slug: 'new-org' }, 'actor-super')

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'org.created',
          resource: 'organization',
          actorId: 'actor-super',
        })
      )
    })
  })

  // -----------------------------------------------------------------------
  // updateOrganization
  // -----------------------------------------------------------------------
  describe('updateOrganization', () => {
    it('should update name and slug with before/after audit log', async () => {
      // Arrange -- read before-state then perform update
      const beforeOrg = { ...baseOrg }
      const updatedOrg = { ...baseOrg, name: 'Acme Updated', slug: 'acme-updated' }

      db.select.mockReturnValueOnce(createChainMock([beforeOrg]))
      db.update.mockReturnValueOnce(createChainMock([updatedOrg]))

      // Act
      const result = await service.updateOrganization(
        'org-1',
        { name: 'Acme Updated', slug: 'acme-updated' },
        'actor-super'
      )

      // Assert
      expect(result).toBeDefined()
      expect(db.update).toHaveBeenCalled()
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'org.updated',
          resource: 'organization',
          resourceId: 'org-1',
          actorId: 'actor-super',
          before: expect.objectContaining({ name: 'Acme Corp' }),
          after: expect.objectContaining({ name: 'Acme Updated' }),
        })
      )
    })

    it('should throw AdminOrgNotFoundException when org not found', async () => {
      // Arrange
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act & Assert
      await expect(
        service.updateOrganization('org-missing', { name: 'New Name' }, 'actor-super')
      ).rejects.toThrow(AdminOrgNotFoundException)
    })

    it('should throw OrgSlugConflictException on duplicate slug (pg error 23505)', async () => {
      // Arrange -- org exists, but update throws a unique constraint violation
      db.select.mockReturnValueOnce(createChainMock([baseOrg]))
      const pgError = { code: '23505', constraint_name: 'organizations_slug_unique' }
      const updateChain = createChainMock([])
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock to simulate pg rejection
      updateChain.then = (_resolve: unknown, reject: (e: unknown) => void) => reject(pgError)
      db.update.mockReturnValueOnce(updateChain)

      // Act & Assert
      await expect(
        service.updateOrganization('org-1', { slug: 'taken-slug' }, 'actor-super')
      ).rejects.toThrow(OrgSlugConflictException)
    })

    it('should throw OrgCycleDetectedException when reparenting to a descendant', async () => {
      // Arrange -- org-A is parent of org-B. Trying to set org-A's parent to org-B
      const orgA = { ...baseOrg, id: 'org-A', parentOrganizationId: null }

      // First select: fetch org-A (the org being updated) -- on db
      db.select.mockReturnValueOnce(createChainMock([orgA]))

      // validateHierarchy now uses db.transaction(); configure tx.select for walk-up
      const txSelect = vi.fn()
      // Walk-up from org-B: find org-B, its parent is org-A (the target) -- cycle!
      txSelect.mockReturnValueOnce(
        createChainMock([{ id: 'org-B', parentOrganizationId: 'org-A' }])
      )
      db.transaction.mockImplementationOnce(async (fn: (tx: Record<string, unknown>) => unknown) =>
        fn({ select: txSelect, insert: vi.fn(), update: vi.fn(), delete: vi.fn() })
      )

      // Act & Assert
      await expect(
        service.updateOrganization('org-A', { parentOrganizationId: 'org-B' }, 'actor-super')
      ).rejects.toThrow(OrgCycleDetectedException)
    })

    it('should throw OrgDepthExceededException when reparent creates depth > 3', async () => {
      // Arrange -- reparenting would create a chain deeper than 3
      const orgToUpdate = { ...baseOrg, id: 'org-move', parentOrganizationId: null }

      // First select: fetch the org being updated -- on db
      db.select.mockReturnValueOnce(createChainMock([orgToUpdate]))

      // validateHierarchy uses db.transaction(); configure tx.select for walk-up
      const txSelect = vi.fn()
      // Walk-up from newParent: newParent -> parent -> grandparent -> root (depth=2)
      txSelect
        .mockReturnValueOnce(
          createChainMock([{ id: 'org-new-parent', parentOrganizationId: 'org-parent' }])
        )
        .mockReturnValueOnce(
          createChainMock([{ id: 'org-parent', parentOrganizationId: 'org-gp' }])
        )
        .mockReturnValueOnce(createChainMock([{ id: 'org-gp', parentOrganizationId: null }]))
      db.transaction.mockImplementationOnce(async (fn: (tx: Record<string, unknown>) => unknown) =>
        fn({ select: txSelect, insert: vi.fn(), update: vi.fn(), delete: vi.fn() })
      )

      // getSubtreeDepth uses db.select -- org-move has no children
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act & Assert -- depth(2) + 1 + subtreeDepth(0) = 3 >= 3, throws
      await expect(
        service.updateOrganization(
          'org-move',
          { parentOrganizationId: 'org-new-parent' },
          'actor-super'
        )
      ).rejects.toThrow(OrgDepthExceededException)
    })

    it('should not call auditService.log when org not found', async () => {
      // Arrange
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act
      await service.updateOrganization('org-missing', { name: 'X' }, 'actor-super').catch(() => {})

      // Assert
      expect(auditService.log).not.toHaveBeenCalled()
    })
  })
})

// ---------------------------------------------------------------------------
// AdminOrganizationsQueryService
// ---------------------------------------------------------------------------

describe('AdminOrganizationsQueryService', () => {
  let queryService: AdminOrganizationsQueryService
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    vi.restoreAllMocks()
    ;({ service: queryService, db } = createQueryService())
  })

  // -----------------------------------------------------------------------
  // listOrganizations
  // -----------------------------------------------------------------------
  describe('listOrganizations', () => {
    it('should return cursor-paginated organizations', async () => {
      // Arrange
      const orgRow = { ...baseOrg, memberCount: 5 }
      const orgsChain = createChainMock([orgRow])
      db.select.mockReturnValueOnce(orgsChain)

      // Act
      const result = await queryService.listOrganizations({}, undefined, 20)

      // Assert
      expect(result).toBeDefined()
      expect(result.data).toBeDefined()
      expect(result.cursor).toBeDefined()
    })

    it('should return hasMore=true and next cursor when more rows exist', async () => {
      // Arrange -- return limit+1 rows to signal more data
      const limit = 2
      const rows = [
        { ...baseOrg, id: 'org-1', createdAt: new Date('2025-01-03'), memberCount: 3 },
        { ...baseOrg, id: 'org-2', createdAt: new Date('2025-01-02'), memberCount: 1 },
        { ...baseOrg, id: 'org-3', createdAt: new Date('2025-01-01'), memberCount: 0 },
      ]
      db.select.mockReturnValueOnce(createChainMock(rows))

      // Act
      const result = await queryService.listOrganizations({}, undefined, limit)

      // Assert
      expect(result.cursor.hasMore).toBe(true)
      expect(result.cursor.next).not.toBeNull()
      expect(result.data).toHaveLength(limit)
    })

    it('should return hasMore=false when fewer rows than limit exist', async () => {
      // Arrange
      const rows = [{ ...baseOrg, id: 'org-1', createdAt: new Date('2025-01-01'), memberCount: 2 }]
      db.select.mockReturnValueOnce(createChainMock(rows))

      // Act
      const result = await queryService.listOrganizations({}, undefined, 20)

      // Assert
      expect(result.cursor.hasMore).toBe(false)
      expect(result.cursor.next).toBeNull()
    })

    it('should filter by status active (deletedAt IS NULL)', async () => {
      // Arrange
      const orgsChain = createChainMock([])
      db.select.mockReturnValueOnce(orgsChain)

      // Act
      await queryService.listOrganizations({ status: 'active' }, undefined, 20)

      // Assert -- where must have been called with active filter conditions
      expect(orgsChain.where).toHaveBeenCalled()
    })

    it('should filter by status archived (deletedAt IS NOT NULL)', async () => {
      // Arrange
      const archivedOrg = {
        ...baseOrg,
        id: 'org-archived',
        deletedAt: new Date('2025-06-01'),
        memberCount: 0,
      }
      const orgsChain = createChainMock([archivedOrg])
      db.select.mockReturnValueOnce(orgsChain)

      // Act
      const result = await queryService.listOrganizations({ status: 'archived' }, undefined, 20)

      // Assert
      expect(result.data).toBeDefined()
      expect(orgsChain.where).toHaveBeenCalled()
    })

    it('should search by name or slug using ILIKE', async () => {
      // Arrange
      const orgsChain = createChainMock([])
      db.select.mockReturnValueOnce(orgsChain)

      // Act
      await queryService.listOrganizations({ search: 'acme' }, undefined, 20)

      // Assert
      expect(orgsChain.where).toHaveBeenCalled()
    })

    it('should apply cursor condition when cursor is provided', async () => {
      // Arrange -- encode a valid cursor
      const cursor = btoa(JSON.stringify({ t: '2025-01-01T00:00:00.000Z', i: 'org-abc' }))
      const orgsChain = createChainMock([])
      db.select.mockReturnValueOnce(orgsChain)

      // Act
      await queryService.listOrganizations({}, cursor, 20)

      // Assert -- where should include cursor condition
      expect(orgsChain.where).toHaveBeenCalled()
    })

    it('should return empty data when no orgs exist', async () => {
      // Arrange
      db.select.mockReturnValueOnce(createChainMock([]))

      // Act
      const result = await queryService.listOrganizations({}, undefined, 20)

      // Assert
      expect(result.data).toEqual([])
      expect(result.cursor.hasMore).toBe(false)
      expect(result.cursor.next).toBeNull()
    })

    it('should include memberCount in response', async () => {
      // Arrange
      const orgRow = { ...baseOrg, memberCount: 42 }
      db.select.mockReturnValueOnce(createChainMock([orgRow]))

      // Act
      const result = await queryService.listOrganizations({}, undefined, 20)

      // Assert
      expect(result.data[0]).toBeDefined()
      expect(result.data[0]?.memberCount).toBe(42)
    })
  })

  // -----------------------------------------------------------------------
  // listOrganizationsForTree
  // -----------------------------------------------------------------------
  describe('listOrganizationsForTree', () => {
    it('should return all non-deleted orgs with id, name, slug, parentOrganizationId', async () => {
      // Arrange
      const treeOrgs = [
        { id: 'org-1', name: 'Parent Corp', slug: 'parent-corp', parentOrganizationId: null },
        { id: 'org-2', name: 'Child Inc', slug: 'child-inc', parentOrganizationId: 'org-1' },
      ]
      // First call: count query; second call: org list
      db.select
        .mockReturnValueOnce(createChainMock([{ count: 2 }]))
        .mockReturnValueOnce(createChainMock(treeOrgs))

      // Act
      const result = await queryService.listOrganizationsForTree()

      // Assert
      expect(result.treeViewAvailable).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toHaveProperty('id')
      expect(result.data[0]).toHaveProperty('name')
      expect(result.data[0]).toHaveProperty('slug')
      expect(result.data[0]).toHaveProperty('parentOrganizationId')
    })

    it('should return treeViewAvailable=false when count exceeds 1000', async () => {
      // Arrange -- count query returns > 1000
      db.select.mockReturnValueOnce(createChainMock([{ count: 1500 }]))

      // Act
      const result = await queryService.listOrganizationsForTree()

      // Assert
      expect(result.treeViewAvailable).toBe(false)
    })

    it('should return treeViewAvailable=true when count is within 1000', async () => {
      // Arrange -- count query returns <= 1000
      const treeOrgs = [{ id: 'org-1', name: 'Root', slug: 'root', parentOrganizationId: null }]
      db.select
        .mockReturnValueOnce(createChainMock([{ count: 500 }]))
        .mockReturnValueOnce(createChainMock(treeOrgs))

      // Act
      const result = await queryService.listOrganizationsForTree()

      // Assert
      expect(result.treeViewAvailable).toBe(true)
    })
  })
})
