import type { ClsService } from 'nestjs-cls'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DrizzleTx } from '../database/drizzle.provider.js'
import type { TenantService } from '../tenant/tenant.service.js'
import { DefaultRoleException } from './exceptions/defaultRole.exception.js'
import { RoleInsertFailedException } from './exceptions/roleInsertFailed.exception.js'
import { RoleNotFoundException } from './exceptions/roleNotFound.exception.js'
import { RoleSlugConflictException } from './exceptions/roleSlugConflict.exception.js'
import type { RbacRepository } from './rbac.repository.js'
import { RbacService } from './rbac.service.js'

function createMockRbacRepo(): RbacRepository {
  return {
    listRoles: vi.fn(),
    findRoleBySlug: vi.fn(),
    insertRole: vi.fn(),
    findRoleById: vi.fn(),
    updateRole: vi.fn(),
    deleteRolePermissions: vi.fn(),
    deleteRole: vi.fn(),
    findViewerRole: vi.fn(),
    reassignMembersToRole: vi.fn(),
    getAllPermissions: vi.fn(),
    insertRolePermissions: vi.fn(),
    getRolePermissions: vi.fn(),
    seedDefaultRoles: vi.fn(),
    listRolesWithPermissions: vi.fn(),
  } as unknown as RbacRepository
}

describe('RbacService', () => {
  let mockCls: ClsService
  let mockTenantService: TenantService

  beforeEach(() => {
    mockCls = { get: vi.fn().mockReturnValue('tenant-1') } as unknown as ClsService
    mockTenantService = {
      query: vi.fn().mockImplementation((cb: (tx: unknown) => unknown) => cb(null)),
      queryAs: vi.fn().mockImplementation((_id: string, cb: (tx: unknown) => unknown) => cb(null)),
    } as unknown as TenantService
  })

  describe('listRoles', () => {
    it('should list roles for current tenant', async () => {
      // Arrange
      const mockRoles = [{ id: 'r-1', name: 'Owner', slug: 'owner' }]
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.listRoles as ReturnType<typeof vi.fn>).mockResolvedValue(mockRoles)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act
      const result = await service.listRoles()

      // Assert
      expect(result).toEqual(mockRoles)
    })
  })

  describe('createRole', () => {
    it('should create a custom role with permissions', async () => {
      // Arrange
      const newRole = { id: 'r-new', name: 'Custom', slug: 'custom', isDefault: false }
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      ;(mockRepo.insertRole as ReturnType<typeof vi.fn>).mockResolvedValue(newRole)
      ;(mockRepo.getAllPermissions as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'p-1', resource: 'roles', action: 'read' },
      ])
      ;(mockRepo.insertRolePermissions as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act
      const result = await service.createRole({ name: 'Custom', permissions: ['roles:read'] })

      // Assert
      expect(result).toEqual(newRole)
    })

    it('should throw RoleInsertFailedException when insert returns empty', async () => {
      // Arrange
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      ;(mockRepo.insertRole as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      ;(mockRepo.getAllPermissions as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'p-1', resource: 'roles', action: 'read' },
      ])

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act & Assert
      await expect(
        service.createRole({ name: 'Ghost', permissions: ['roles:read'] })
      ).rejects.toThrow(RoleInsertFailedException)
    })

    it('should reject duplicate slug within same tenant', async () => {
      // Arrange
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleBySlug as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'r-existing' })

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act & Assert
      await expect(
        service.createRole({ name: 'Owner', permissions: ['roles:read'] })
      ).rejects.toThrow(RoleSlugConflictException)
    })
  })

  describe('updateRole', () => {
    it('should update role fields', async () => {
      // Arrange
      const existingRole = { id: 'r-1', name: 'Old', slug: 'old', tenantId: 'tenant-1' }
      const updatedRole = { id: 'r-1', name: 'New', slug: 'new' }
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleById as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(existingRole)
        .mockResolvedValueOnce(updatedRole)
      ;(mockRepo.findRoleBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      ;(mockRepo.updateRole as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act
      const result = await service.updateRole('r-1', { name: 'New' })

      // Assert
      expect(result).toEqual(updatedRole)
    })

    it('should throw RoleNotFoundException if not found', async () => {
      // Arrange
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act & Assert
      await expect(service.updateRole('r-missing', { name: 'New' })).rejects.toThrow(
        RoleNotFoundException
      )
    })
  })

  describe('deleteRole', () => {
    it('should delete a custom role and fallback members to Viewer', async () => {
      // Arrange
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'r-custom',
        isDefault: false,
        tenantId: 'tenant-1',
      })
      ;(mockRepo.findViewerRole as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'r-viewer' })
      ;(mockRepo.reassignMembersToRole as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      ;(mockRepo.deleteRole as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act
      const result = await service.deleteRole('r-custom')

      // Assert
      expect(result).toEqual({ deleted: true })
    })

    it('should reject deleting a default role', async () => {
      // Arrange
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'r-owner',
        isDefault: true,
        tenantId: 'tenant-1',
      })

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act & Assert
      await expect(service.deleteRole('r-owner')).rejects.toThrow(DefaultRoleException)
    })

    it('should throw RoleNotFoundException if not found', async () => {
      // Arrange
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act & Assert
      await expect(service.deleteRole('r-missing')).rejects.toThrow(RoleNotFoundException)
    })
  })

  describe('getRolePermissions', () => {
    it('should return permissions for a role', async () => {
      // Arrange
      const perms = [{ id: 'p-1', resource: 'roles', action: 'read', description: 'View roles' }]
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'r-1' })
      ;(mockRepo.getRolePermissions as ReturnType<typeof vi.fn>).mockResolvedValue(perms)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act
      const result = await service.getRolePermissions('r-1')

      // Assert
      expect(result).toEqual(perms)
    })

    it('should throw RoleNotFoundException if not found', async () => {
      // Arrange
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act & Assert
      await expect(service.getRolePermissions('r-missing')).rejects.toThrow(RoleNotFoundException)
    })
  })

  describe('seedDefaultRoles', () => {
    it('should seed Owner, Admin, Member, Viewer roles with permissions', async () => {
      // Arrange
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.seedDefaultRoles as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act
      await service.seedDefaultRoles('org-1')

      // Assert
      expect(mockTenantService.queryAs).toHaveBeenCalledWith('org-1', expect.any(Function))
      expect(mockRepo.seedDefaultRoles).toHaveBeenCalledWith(
        'org-1',
        expect.arrayContaining([
          expect.objectContaining({ name: expect.any(String), slug: expect.any(String) }),
        ]),
        null
      )
      // 4 default roles should be seeded
      // biome-ignore lint/style/noNonNullAssertion: verified seedDefaultRoles was called above
      const callArgs = (mockRepo.seedDefaultRoles as ReturnType<typeof vi.fn>).mock.calls[0]!
      expect(callArgs[1]).toHaveLength(4)
    })

    it('should use provided tx directly without opening a new one', async () => {
      // Arrange
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.seedDefaultRoles as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)
      const fakeTx = {} as DrizzleTx

      // Act
      await service.seedDefaultRoles('org-2', fakeTx)

      // Assert — should call repo directly with the provided tx, not queryAs
      expect(mockTenantService.queryAs).not.toHaveBeenCalled()
      expect(mockRepo.seedDefaultRoles).toHaveBeenCalledWith('org-2', expect.any(Array), fakeTx)
    })
  })

  describe('listRolesWithPermissions', () => {
    it('should delegate to repo.listRolesWithPermissions via tenant query', async () => {
      // Arrange
      const mockRoles = [{ id: 'r-1', name: 'Owner', slug: 'owner', permissions: [{ id: 'p-1' }] }]
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.listRolesWithPermissions as ReturnType<typeof vi.fn>).mockResolvedValue(mockRoles)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act
      const result = await service.listRolesWithPermissions()

      // Assert
      expect(result).toEqual(mockRoles)
      expect(mockTenantService.query).toHaveBeenCalled()
      expect(mockRepo.listRolesWithPermissions).toHaveBeenCalledWith(null)
    })

    it('should return empty array when no roles exist', async () => {
      // Arrange
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.listRolesWithPermissions as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act
      const result = await service.listRolesWithPermissions()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('createRole — empty permissions branch', () => {
    it('should create role without calling insertRolePermissions when permissions is empty', async () => {
      // Arrange
      const newRole = { id: 'r-new', name: 'Custom', slug: 'custom', isDefault: false }
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      ;(mockRepo.insertRole as ReturnType<typeof vi.fn>).mockResolvedValue(newRole)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act
      const result = await service.createRole({ name: 'Custom', permissions: [] })

      // Assert
      expect(result).toEqual(newRole)
      expect(mockRepo.getAllPermissions).not.toHaveBeenCalled()
      expect(mockRepo.insertRolePermissions).not.toHaveBeenCalled()
    })
  })

  describe('updateRole — additional branches', () => {
    it('should skip slug collision check when name produces same slug as existing', async () => {
      // Arrange
      const existingRole = { id: 'r-1', name: 'Owner', slug: 'owner', tenantId: 'tenant-1' }
      const updatedRole = { id: 'r-1', name: 'Owner', slug: 'owner' }
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleById as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(existingRole)
        .mockResolvedValueOnce(updatedRole)
      ;(mockRepo.updateRole as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act
      await service.updateRole('r-1', { name: 'Owner' })

      // Assert — findRoleBySlug should NOT be called when slug unchanged
      expect(mockRepo.findRoleBySlug).not.toHaveBeenCalled()
    })

    it('should skip repo.updateRole when no field-level changes', async () => {
      // Arrange — no name, no description passed → updates stays empty
      const existingRole = { id: 'r-1', name: 'Owner', slug: 'owner', tenantId: 'tenant-1' }
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleById as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(existingRole)
        .mockResolvedValueOnce(existingRole)
      ;(mockRepo.deleteRolePermissions as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      ;(mockRepo.getAllPermissions as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'p-1', resource: 'roles', action: 'read' },
      ])
      ;(mockRepo.insertRolePermissions as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act — only permissions provided, no field changes
      await service.updateRole('r-1', { permissions: ['roles:read'] })

      // Assert — repo.updateRole should NOT be called
      expect(mockRepo.updateRole).not.toHaveBeenCalled()
      expect(mockRepo.deleteRolePermissions).toHaveBeenCalledWith('r-1', null)
      expect(mockRepo.insertRolePermissions).toHaveBeenCalled()
    })

    it('should delete old permissions but skip re-insert when new permissions list is empty', async () => {
      // Arrange
      const existingRole = { id: 'r-1', name: 'Owner', slug: 'owner', tenantId: 'tenant-1' }
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleById as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(existingRole)
        .mockResolvedValueOnce(existingRole)
      ;(mockRepo.deleteRolePermissions as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act
      await service.updateRole('r-1', { permissions: [] })

      // Assert
      expect(mockRepo.deleteRolePermissions).toHaveBeenCalledWith('r-1', null)
      expect(mockRepo.getAllPermissions).not.toHaveBeenCalled()
      expect(mockRepo.insertRolePermissions).not.toHaveBeenCalled()
    })
  })

  describe('deleteRole — null viewerRole branch', () => {
    it('should skip reassignMembersToRole when no Viewer role exists', async () => {
      // Arrange
      const mockRepo = createMockRbacRepo()
      ;(mockRepo.findRoleById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'r-custom',
        isDefault: false,
        tenantId: 'tenant-1',
      })
      ;(mockRepo.findViewerRole as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      ;(mockRepo.deleteRole as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacService(mockTenantService, mockCls, mockRepo as never)

      // Act
      const result = await service.deleteRole('r-custom')

      // Assert
      expect(mockRepo.reassignMembersToRole).not.toHaveBeenCalled()
      expect(mockRepo.deleteRole).toHaveBeenCalledWith('r-custom', null)
      expect(result).toEqual({ deleted: true })
    })
  })
})
