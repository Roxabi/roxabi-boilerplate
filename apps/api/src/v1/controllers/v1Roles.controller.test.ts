import { Reflector } from '@nestjs/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthenticatedSession } from '../../auth/types.js'
import type { RbacService } from '../../rbac/rbac.service.js'
import { V1ExceptionFilter } from '../filters/v1Exception.filter.js'
import { V1RolesController } from './v1Roles.controller.js'

const mockRbacService: RbacService = {
  listRolesWithPermissions: vi.fn(),
} as unknown as RbacService

const mockSession: AuthenticatedSession = {
  user: { id: 'user-1' },
  session: { id: 'session-1', activeOrganizationId: 'org-1' },
  permissions: ['roles:read'],
  actorType: 'api_key',
}

describe('V1RolesController', () => {
  const controller = new V1RolesController(mockRbacService)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('decorator metadata', () => {
    const reflector = new Reflector()

    it('requires API key at controller level', () => {
      // Arrange & Act
      const metadata = reflector.get('REQUIRE_API_KEY', V1RolesController)

      // Assert
      expect(metadata).toBe(true)
    })

    it('applies V1ExceptionFilter at controller level', () => {
      // Arrange & Act
      const filters = reflector.get('__exceptionFilters__', V1RolesController)

      // Assert
      expect(filters).toContain(V1ExceptionFilter)
    })

    it('requires roles:read permission on listRoles', () => {
      // Arrange & Act
      const metadata = reflector.get('PERMISSIONS', V1RolesController.prototype.listRoles)

      // Assert
      expect(metadata).toEqual(['roles:read'])
    })
  })

  describe('listRoles', () => {
    it('calls rbacService.listRolesWithPermissions', async () => {
      // Arrange
      vi.mocked(mockRbacService.listRolesWithPermissions).mockResolvedValue([])

      // Act
      await controller.listRoles(mockSession)

      // Assert
      expect(mockRbacService.listRolesWithPermissions).toHaveBeenCalledOnce()
    })

    it('maps permissions to resource:action format', async () => {
      // Arrange
      vi.mocked(mockRbacService.listRolesWithPermissions).mockResolvedValue([
        {
          id: 'role-1',
          name: 'Admin',
          description: 'Administrator',
          permissions: [
            { id: 'p-1', resource: 'members', action: 'read', description: '' },
            { id: 'p-2', resource: 'users', action: 'write', description: '' },
            { id: 'p-3', resource: 'roles', action: 'delete', description: '' },
          ],
        },
      ] as never)

      // Act
      const result = await controller.listRoles(mockSession)

      // Assert
      expect(result[0]!.permissions).toEqual(['members:read', 'users:write', 'roles:delete'])
    })

    it('returns V1RoleResponse[] with correct shape', async () => {
      // Arrange
      vi.mocked(mockRbacService.listRolesWithPermissions).mockResolvedValue([
        {
          id: 'role-1',
          name: 'Admin',
          description: 'Administrator role',
          permissions: [{ id: 'p-1', resource: 'members', action: 'read', description: '' }],
        },
      ] as never)

      // Act
      const result = await controller.listRoles(mockSession)

      // Assert
      expect(result).toEqual([
        {
          id: 'role-1',
          name: 'Admin',
          description: 'Administrator role',
          permissions: ['members:read'],
        },
      ])
    })

    it('returns empty array when no roles exist', async () => {
      // Arrange
      vi.mocked(mockRbacService.listRolesWithPermissions).mockResolvedValue([])

      // Act
      const result = await controller.listRoles(mockSession)

      // Assert
      expect(result).toEqual([])
    })

    it('handles role with null description', async () => {
      // Arrange
      vi.mocked(mockRbacService.listRolesWithPermissions).mockResolvedValue([
        { id: 'role-1', name: 'Member', description: null, permissions: [] },
      ] as never)

      // Act
      const result = await controller.listRoles(mockSession)

      // Assert
      expect(result[0]!.description).toBeNull()
    })

    it('handles role with no permissions', async () => {
      // Arrange
      vi.mocked(mockRbacService.listRolesWithPermissions).mockResolvedValue([
        { id: 'role-1', name: 'Viewer', description: null, permissions: [] },
      ] as never)

      // Act
      const result = await controller.listRoles(mockSession)

      // Assert
      expect(result[0]!.permissions).toEqual([])
    })

    it('processes multiple roles with their respective permissions', async () => {
      // Arrange
      vi.mocked(mockRbacService.listRolesWithPermissions).mockResolvedValue([
        {
          id: 'r-1',
          name: 'Admin',
          description: null,
          permissions: [{ id: 'p-1', resource: 'users', action: 'write', description: '' }],
        },
        {
          id: 'r-2',
          name: 'Member',
          description: null,
          permissions: [{ id: 'p-2', resource: 'users', action: 'read', description: '' }],
        },
      ] as never)

      // Act
      const result = await controller.listRoles(mockSession)

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0]!.permissions).toEqual(['users:write'])
      expect(result[1]?.permissions).toEqual(['users:read'])
    })

    it('propagates errors from rbacService.listRolesWithPermissions', async () => {
      // Arrange
      vi.mocked(mockRbacService.listRolesWithPermissions).mockRejectedValue(new Error('DB error'))

      // Act & Assert
      await expect(controller.listRoles(mockSession)).rejects.toThrow('DB error')
    })

    it('propagates errors when permissions fetch fails', async () => {
      // Arrange
      vi.mocked(mockRbacService.listRolesWithPermissions).mockRejectedValue(
        new Error('Permissions error')
      )

      // Act & Assert
      await expect(controller.listRoles(mockSession)).rejects.toThrow('Permissions error')
    })
  })
})
