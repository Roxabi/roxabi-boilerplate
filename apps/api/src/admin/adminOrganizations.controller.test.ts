import { BadRequestException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { AdminMembersService } from './adminMembers.service.js'
import { AdminOrganizationsController } from './adminOrganizations.controller.js'
import type { AdminOrganizationsDeletionService } from './adminOrganizations.deletion.js'
import type { AdminOrganizationsService } from './adminOrganizations.service.js'
import { OrgCycleDetectedException } from './exceptions/orgCycleDetected.exception.js'
import { OrgDepthExceededException } from './exceptions/orgDepthExceeded.exception.js'
import { AdminOrgNotFoundException } from './exceptions/orgNotFound.exception.js'
import { OrgSlugConflictException } from './exceptions/orgSlugConflict.exception.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockAdminOrganizationsService: AdminOrganizationsService = {
  listOrganizations: vi.fn(),
  listOrganizationsForTree: vi.fn(),
  getOrganizationDetail: vi.fn(),
  createOrganization: vi.fn(),
  updateOrganization: vi.fn(),
} as unknown as AdminOrganizationsService

const mockAdminOrganizationsDeletionService: AdminOrganizationsDeletionService = {
  getDeletionImpact: vi.fn(),
  deleteOrganization: vi.fn(),
  restoreOrganization: vi.fn(),
} as unknown as AdminOrganizationsDeletionService

const mockAdminMembersService: AdminMembersService = {
  changeMemberRole: vi.fn(),
} as unknown as AdminMembersService

// Reconstruct Zod schemas from admin-organizations.controller.ts for validation testing.
// The source schemas are module-private and cannot be imported.
const createOrgSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  parentOrganizationId: z.string().uuid().nullable().optional(),
})

const updateOrgSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  parentOrganizationId: z.string().uuid().nullable().optional(),
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminOrganizationsController', () => {
  const controller = new AdminOrganizationsController(
    mockAdminOrganizationsService,
    mockAdminMembersService,
    mockAdminOrganizationsDeletionService
  )

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const mockSession = {
    user: { id: 'superadmin-1' },
  }

  // -----------------------------------------------------------------------
  // Decorator verification
  // -----------------------------------------------------------------------
  it('should use @Roles(superadmin) and @SkipOrg() on the controller class', () => {
    // Arrange
    const reflector = new Reflector()

    // Act
    const roles = reflector.get('ROLES', AdminOrganizationsController)
    const skipOrg = reflector.get('SKIP_ORG', AdminOrganizationsController)

    // Assert
    expect(roles).toEqual(['superadmin'])
    expect(skipOrg).toBe(true)
  })

  // -----------------------------------------------------------------------
  // GET /api/admin/organizations
  // -----------------------------------------------------------------------
  describe('GET /api/admin/organizations', () => {
    it('should delegate to service.listOrganizations with default pagination', async () => {
      // Arrange
      const expected = { data: [], cursor: { next: null, hasMore: false } }
      vi.mocked(mockAdminOrganizationsService.listOrganizations).mockResolvedValue(expected)

      // Act
      const result = await controller.listOrganizations()

      // Assert
      expect(result).toEqual(expected)
      expect(mockAdminOrganizationsService.listOrganizations).toHaveBeenCalledWith(
        { status: undefined, search: undefined },
        undefined,
        20
      )
    })

    it('should delegate to service.listOrganizationsForTree when view=tree', async () => {
      // Arrange
      const expected = { treeViewAvailable: true, data: [] }
      vi.mocked(mockAdminOrganizationsService.listOrganizationsForTree).mockResolvedValue(
        expected as never
      )

      // Act
      const result = await controller.listOrganizations(
        undefined,
        undefined,
        undefined,
        undefined,
        'tree'
      )

      // Assert
      expect(result).toEqual(expected)
      expect(mockAdminOrganizationsService.listOrganizationsForTree).toHaveBeenCalledTimes(1)
    })

    it('should pass filter params to service', async () => {
      // Arrange
      vi.mocked(mockAdminOrganizationsService.listOrganizations).mockResolvedValue({
        data: [],
        cursor: { next: null, hasMore: false },
      })

      // Act
      await controller.listOrganizations('cursor-abc', '10', 'active', 'acme')

      // Assert
      expect(mockAdminOrganizationsService.listOrganizations).toHaveBeenCalledWith(
        { status: 'active', search: 'acme' },
        'cursor-abc',
        10
      )
    })

    it('should clamp limit to range [1, 100]', async () => {
      // Arrange
      vi.mocked(mockAdminOrganizationsService.listOrganizations).mockResolvedValue({
        data: [],
        cursor: { next: null, hasMore: false },
      })

      // Act — limit exceeds max
      await controller.listOrganizations(undefined, '500')

      // Assert
      expect(mockAdminOrganizationsService.listOrganizations).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        100
      )
    })

    it('should reject invalid status value', async () => {
      // Act & Assert
      await expect(controller.listOrganizations(undefined, undefined, 'deleted')).rejects.toThrow(
        BadRequestException
      )
    })

    it('should trim search whitespace', async () => {
      // Arrange
      vi.mocked(mockAdminOrganizationsService.listOrganizations).mockResolvedValue({
        data: [],
        cursor: { next: null, hasMore: false },
      })

      // Act
      await controller.listOrganizations(undefined, undefined, undefined, '  acme  ')

      // Assert
      expect(mockAdminOrganizationsService.listOrganizations).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'acme' }),
        undefined,
        20
      )
    })
  })

  // -----------------------------------------------------------------------
  // POST /api/admin/organizations
  // -----------------------------------------------------------------------
  describe('POST /api/admin/organizations', () => {
    it('should delegate to service.createOrganization with body and actor id', async () => {
      // Arrange
      const createdOrg = { id: 'org-1', name: 'Acme', slug: 'acme' }
      vi.mocked(mockAdminOrganizationsService.createOrganization).mockResolvedValue(
        createdOrg as never
      )
      const body = { name: 'Acme', slug: 'acme' }

      // Act
      const result = await controller.createOrganization(mockSession as never, body)

      // Assert
      expect(result).toEqual(createdOrg)
      expect(mockAdminOrganizationsService.createOrganization).toHaveBeenCalledWith(
        body,
        'superadmin-1'
      )
    })

    it('should propagate OrgSlugConflictException on slug conflict', async () => {
      // Arrange
      vi.mocked(mockAdminOrganizationsService.createOrganization).mockRejectedValue(
        new OrgSlugConflictException()
      )

      // Act & Assert
      await expect(
        controller.createOrganization(mockSession as never, { name: 'Acme', slug: 'acme' })
      ).rejects.toThrow(OrgSlugConflictException)
    })

    it('should propagate OrgDepthExceededException on depth exceeded', async () => {
      // Arrange
      vi.mocked(mockAdminOrganizationsService.createOrganization).mockRejectedValue(
        new OrgDepthExceededException()
      )

      // Act & Assert
      await expect(
        controller.createOrganization(mockSession as never, {
          name: 'Deep Org',
          slug: 'deep-org',
          parentOrganizationId: 'parent-id',
        })
      ).rejects.toThrow(OrgDepthExceededException)
    })
  })

  // -----------------------------------------------------------------------
  // POST schema validation
  // -----------------------------------------------------------------------
  describe('createOrgSchema validation', () => {
    it('should accept valid create body with name and slug', () => {
      // Arrange
      const input = { name: 'Acme Corp', slug: 'acme-corp' }

      // Act
      const result = createOrgSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    it('should reject missing name', () => {
      // Arrange
      const input = { slug: 'acme-corp' }

      // Act
      const result = createOrgSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    it('should reject missing slug', () => {
      // Arrange
      const input = { name: 'Acme Corp' }

      // Act
      const result = createOrgSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    it('should reject slug with uppercase characters', () => {
      // Arrange
      const input = { name: 'Acme', slug: 'Acme-Corp' }

      // Act
      const result = createOrgSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    it('should reject slug with special characters', () => {
      // Arrange
      const input = { name: 'Acme', slug: 'acme_corp!' }

      // Act
      const result = createOrgSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    it('should accept null parentOrganizationId', () => {
      // Arrange
      const input = { name: 'Acme', slug: 'acme', parentOrganizationId: null }

      // Act
      const result = createOrgSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    it('should reject non-UUID parentOrganizationId', () => {
      // Arrange
      const input = { name: 'Acme', slug: 'acme', parentOrganizationId: 'not-a-uuid' }

      // Act
      const result = createOrgSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })

  describe('updateOrgSchema validation', () => {
    it('should accept empty body (all fields optional)', () => {
      // Arrange & Act
      const result = updateOrgSchema.safeParse({})

      // Assert
      expect(result.success).toBe(true)
    })

    it('should reject empty name string', () => {
      // Arrange
      const input = { name: '' }

      // Act
      const result = updateOrgSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    it('should reject slug with spaces', () => {
      // Arrange
      const input = { slug: 'acme corp' }

      // Act
      const result = updateOrgSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // GET /api/admin/organizations/:orgId
  // -----------------------------------------------------------------------
  describe('GET /api/admin/organizations/:orgId', () => {
    it('should delegate to service.getOrganizationDetail', async () => {
      // Arrange
      const detail = { organization: { id: 'org-1' }, members: [], children: [] }
      vi.mocked(mockAdminOrganizationsService.getOrganizationDetail).mockResolvedValue(
        detail as never
      )

      // Act
      const result = await controller.getOrganizationDetail('org-1')

      // Assert
      expect(result).toEqual(detail)
      expect(mockAdminOrganizationsService.getOrganizationDetail).toHaveBeenCalledWith('org-1')
    })

    it('should propagate AdminOrgNotFoundException when org not found', async () => {
      // Arrange
      vi.mocked(mockAdminOrganizationsService.getOrganizationDetail).mockRejectedValue(
        new AdminOrgNotFoundException('org-missing')
      )

      // Act & Assert
      await expect(controller.getOrganizationDetail('org-missing')).rejects.toThrow(
        AdminOrgNotFoundException
      )
    })
  })

  // -----------------------------------------------------------------------
  // PATCH /api/admin/organizations/:orgId
  // -----------------------------------------------------------------------
  describe('PATCH /api/admin/organizations/:orgId', () => {
    it('should delegate to service.updateOrganization with body and actor id', async () => {
      // Arrange
      const updatedOrg = { id: 'org-1', name: 'Acme Updated' }
      vi.mocked(mockAdminOrganizationsService.updateOrganization).mockResolvedValue(
        updatedOrg as never
      )
      const body = { name: 'Acme Updated' }

      // Act
      const result = await controller.updateOrganization('org-1', mockSession as never, body)

      // Assert
      expect(result).toEqual(updatedOrg)
      expect(mockAdminOrganizationsService.updateOrganization).toHaveBeenCalledWith(
        'org-1',
        body,
        'superadmin-1'
      )
    })

    it('should propagate OrgSlugConflictException on slug conflict', async () => {
      // Arrange
      vi.mocked(mockAdminOrganizationsService.updateOrganization).mockRejectedValue(
        new OrgSlugConflictException()
      )

      // Act & Assert
      await expect(
        controller.updateOrganization('org-1', mockSession as never, { slug: 'taken-slug' })
      ).rejects.toThrow(OrgSlugConflictException)
    })

    it('should propagate OrgCycleDetectedException on cycle detected', async () => {
      // Arrange
      vi.mocked(mockAdminOrganizationsService.updateOrganization).mockRejectedValue(
        new OrgCycleDetectedException()
      )

      // Act & Assert
      await expect(
        controller.updateOrganization('org-1', mockSession as never, {
          parentOrganizationId: 'org-child',
        })
      ).rejects.toThrow(OrgCycleDetectedException)
    })
  })

  // -----------------------------------------------------------------------
  // GET /api/admin/organizations/:orgId/deletion-impact
  // -----------------------------------------------------------------------
  describe('GET /api/admin/organizations/:orgId/deletion-impact', () => {
    it('should delegate to service.getDeletionImpact', async () => {
      // Arrange
      const impact = { memberCount: 5, activeMembers: 3, childOrgCount: 2, childMemberCount: 10 }
      vi.mocked(mockAdminOrganizationsDeletionService.getDeletionImpact).mockResolvedValue(impact)

      // Act
      const result = await controller.getDeletionImpact('org-1')

      // Assert
      expect(result).toEqual(impact)
      expect(mockAdminOrganizationsDeletionService.getDeletionImpact).toHaveBeenCalledWith('org-1')
    })

    it('should propagate AdminOrgNotFoundException when org not found', async () => {
      // Arrange
      vi.mocked(mockAdminOrganizationsDeletionService.getDeletionImpact).mockRejectedValue(
        new AdminOrgNotFoundException('org-missing')
      )

      // Act & Assert
      await expect(controller.getDeletionImpact('org-missing')).rejects.toThrow(
        AdminOrgNotFoundException
      )
    })
  })

  // -----------------------------------------------------------------------
  // DELETE /api/admin/organizations/:orgId
  // -----------------------------------------------------------------------
  describe('DELETE /api/admin/organizations/:orgId', () => {
    it('should delegate to service.deleteOrganization and return void (204)', async () => {
      // Arrange
      vi.mocked(mockAdminOrganizationsDeletionService.deleteOrganization).mockResolvedValue({
        id: 'org-1',
      } as never)

      // Act
      const result = await controller.deleteOrganization('org-1', mockSession as never)

      // Assert — controller returns void (204 No Content)
      expect(result).toBeUndefined()
      expect(mockAdminOrganizationsDeletionService.deleteOrganization).toHaveBeenCalledWith(
        'org-1',
        'superadmin-1'
      )
    })

    it('should propagate AdminOrgNotFoundException from service', async () => {
      // Arrange
      vi.mocked(mockAdminOrganizationsDeletionService.deleteOrganization).mockRejectedValue(
        new AdminOrgNotFoundException('org-missing')
      )

      // Act & Assert
      await expect(
        controller.deleteOrganization('org-missing', mockSession as never)
      ).rejects.toThrow(AdminOrgNotFoundException)
    })
  })

  // -----------------------------------------------------------------------
  // POST /api/admin/organizations/:orgId/restore
  // -----------------------------------------------------------------------
  describe('POST /api/admin/organizations/:orgId/restore', () => {
    it('should delegate to service.restoreOrganization', async () => {
      // Arrange
      const restoredOrg = { id: 'org-1', deletedAt: null }
      vi.mocked(mockAdminOrganizationsDeletionService.restoreOrganization).mockResolvedValue(
        restoredOrg as never
      )

      // Act
      const result = await controller.restoreOrganization('org-1', mockSession as never)

      // Assert
      expect(result).toEqual(restoredOrg)
      expect(mockAdminOrganizationsDeletionService.restoreOrganization).toHaveBeenCalledWith(
        'org-1',
        'superadmin-1'
      )
    })

    it('should propagate AdminOrgNotFoundException from service', async () => {
      // Arrange
      vi.mocked(mockAdminOrganizationsDeletionService.restoreOrganization).mockRejectedValue(
        new AdminOrgNotFoundException('org-missing')
      )

      // Act & Assert
      await expect(
        controller.restoreOrganization('org-missing', mockSession as never)
      ).rejects.toThrow(AdminOrgNotFoundException)
    })
  })
})
