import { describe, expect, it, vi } from 'vitest'
import type { PermissionService } from './permission.service.js'
import { PERMISSION_FORMAT, RbacController } from './rbac.controller.js'
import type { RbacService } from './rbac.service.js'
import type { RbacMemberService } from './rbacMember.service.js'

const mockRbacService: RbacService = {
  listRoles: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
  getRolePermissions: vi.fn(),
  seedDefaultRoles: vi.fn(),
} as unknown as RbacService

const mockRbacMemberService: RbacMemberService = {
  transferOwnership: vi.fn(),
  changeMemberRole: vi.fn(),
} as unknown as RbacMemberService

const mockPermissionService: PermissionService = {
  getPermissions: vi.fn(),
  hasPermission: vi.fn(),
  getAllPermissions: vi.fn(),
} as unknown as PermissionService

describe('RbacController', () => {
  const controller = new RbacController(
    mockRbacService,
    mockRbacMemberService,
    mockPermissionService
  )

  describe('listRoles', () => {
    it('should call rbacService.listRoles', async () => {
      vi.mocked(mockRbacService.listRoles).mockResolvedValue([])
      const result = await controller.listRoles()
      expect(result).toEqual([])
      expect(mockRbacService.listRoles).toHaveBeenCalled()
    })
  })

  describe('createRole', () => {
    it('should call rbacService.createRole with body', async () => {
      const body = { name: 'Editor', permissions: ['roles:read'] }
      const createdRole = { id: 'r-1', name: 'Editor', slug: 'editor' }
      vi.mocked(mockRbacService.createRole).mockResolvedValue(createdRole as never)

      const result = await controller.createRole(body)

      expect(result).toEqual(createdRole)
      expect(mockRbacService.createRole).toHaveBeenCalledWith(body)
    })
  })

  describe('updateRole', () => {
    it('should call rbacService.updateRole with id and body', async () => {
      const body = { name: 'New Name' }
      const updatedRole = { id: 'r-1', name: 'New Name', slug: 'new-name' }
      vi.mocked(mockRbacService.updateRole).mockResolvedValue(updatedRole as never)

      const result = await controller.updateRole('r-1', body)

      expect(result).toEqual(updatedRole)
      expect(mockRbacService.updateRole).toHaveBeenCalledWith('r-1', body)
    })
  })

  describe('deleteRole', () => {
    it('should call rbacService.deleteRole with id', async () => {
      vi.mocked(mockRbacService.deleteRole).mockResolvedValue({ deleted: true })

      const result = await controller.deleteRole('r-1')

      expect(result).toEqual({ deleted: true })
      expect(mockRbacService.deleteRole).toHaveBeenCalledWith('r-1')
    })
  })

  describe('getRolePermissions', () => {
    it('should call rbacService.getRolePermissions with role id', async () => {
      vi.mocked(mockRbacService.getRolePermissions).mockResolvedValue([])
      const result = await controller.getRolePermissions('role-1')
      expect(result).toEqual([])
      expect(mockRbacService.getRolePermissions).toHaveBeenCalledWith('role-1')
    })
  })

  describe('listPermissions', () => {
    it('should call permissionService.getAllPermissions', async () => {
      vi.mocked(mockPermissionService.getAllPermissions).mockResolvedValue([])
      const result = await controller.listPermissions()
      expect(result).toEqual([])
      expect(mockPermissionService.getAllPermissions).toHaveBeenCalled()
    })
  })

  describe('transferOwnership', () => {
    it('should call rbacMemberService.transferOwnership with correct args', async () => {
      const session = { user: { id: 'user-1' } }
      const body = { targetMemberId: 'member-2' }
      vi.mocked(mockRbacMemberService.transferOwnership).mockResolvedValue({ transferred: true })

      const result = await controller.transferOwnership(session, body)

      expect(result).toEqual({ transferred: true })
      expect(mockRbacMemberService.transferOwnership).toHaveBeenCalledWith('user-1', 'member-2')
    })
  })

  describe('changeMemberRole', () => {
    it('should call rbacMemberService.changeMemberRole with correct args', async () => {
      const body = { roleId: 'r-1' }
      vi.mocked(mockRbacMemberService.changeMemberRole).mockResolvedValue({ updated: true })

      const result = await controller.changeMemberRole('m-1', body)

      expect(result).toEqual({ updated: true })
      expect(mockRbacMemberService.changeMemberRole).toHaveBeenCalledWith('m-1', 'r-1')
    })
  })
})

describe('PERMISSION_FORMAT regex', () => {
  it('should match valid "resource:action" format', () => {
    expect(PERMISSION_FORMAT.test('roles:read')).toBe(true)
  })

  it('should match hyphenated resource and action names', () => {
    expect(PERMISSION_FORMAT.test('audit-log:read')).toBe(true)
    expect(PERMISSION_FORMAT.test('roles:bulk-delete')).toBe(true)
    expect(PERMISSION_FORMAT.test('audit-log:bulk-export')).toBe(true)
  })

  it('should reject uppercase letters', () => {
    expect(PERMISSION_FORMAT.test('ROLES:READ')).toBe(false)
    expect(PERMISSION_FORMAT.test('Roles:read')).toBe(false)
    expect(PERMISSION_FORMAT.test('roles:Read')).toBe(false)
  })

  it('should reject missing colon separator', () => {
    expect(PERMISSION_FORMAT.test('roles')).toBe(false)
  })

  it('should reject extra colon segments', () => {
    expect(PERMISSION_FORMAT.test('roles:read:extra')).toBe(false)
  })

  it('should reject empty segments', () => {
    expect(PERMISSION_FORMAT.test(':read')).toBe(false)
    expect(PERMISSION_FORMAT.test('roles:')).toBe(false)
    expect(PERMISSION_FORMAT.test(':')).toBe(false)
  })

  it('should reject leading or trailing hyphens', () => {
    expect(PERMISSION_FORMAT.test('-roles:read')).toBe(false)
    expect(PERMISSION_FORMAT.test('roles:-read')).toBe(false)
  })
})
