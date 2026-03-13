import { Reflector } from '@nestjs/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminMembersService } from '../../admin/adminMembers.service.js'
import { V1ExceptionFilter } from '../filters/v1Exception.filter.js'
import { V1MembersController } from './v1Members.controller.js'

const mockAdminMembersService: AdminMembersService = {
  listMembers: vi.fn(),
  removeMember: vi.fn(),
  changeMemberRole: vi.fn(),
} as unknown as AdminMembersService

describe('V1MembersController', () => {
  const controller = new V1MembersController(mockAdminMembersService)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockSession = {
    user: { id: 'user-1' },
    session: { activeOrganizationId: 'org-1' },
  }

  const makeMember = (overrides = {}) => ({
    id: 'm-1',
    userId: 'u-1',
    user: { name: 'Alice', email: 'alice@example.com' },
    role: 'member',
    createdAt: new Date('2024-06-01T00:00:00.000Z'),
    ...overrides,
  })

  describe('listMembers', () => {
    it('calls adminMembersService.listMembers with orgId and pagination', async () => {
      // Arrange
      vi.mocked(mockAdminMembersService.listMembers).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0 },
      } as never)

      // Act
      await controller.listMembers(mockSession as never, 1, 20)

      // Assert
      expect(mockAdminMembersService.listMembers).toHaveBeenCalledWith('org-1', {
        page: 1,
        limit: 20,
        search: undefined,
      })
    })

    it('maps service result to V1PaginatedResponse<V1MemberResponse>', async () => {
      // Arrange
      const member = makeMember()
      vi.mocked(mockAdminMembersService.listMembers).mockResolvedValue({
        data: [member],
        pagination: { page: 1, limit: 20, total: 1 },
      } as never)

      // Act
      const result = await controller.listMembers(mockSession as never, 1, 20)

      // Assert
      expect(result).toEqual({
        data: [
          {
            id: 'm-1',
            userId: 'u-1',
            name: 'Alice',
            email: 'alice@example.com',
            role: 'member',
            joinedAt: '2024-06-01T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      })
    })

    it('clamps page to minimum 1 when 0 is passed', async () => {
      // Arrange
      vi.mocked(mockAdminMembersService.listMembers).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0 },
      } as never)

      // Act
      await controller.listMembers(mockSession as never, 0, 20)

      // Assert
      expect(mockAdminMembersService.listMembers).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ page: 1 })
      )
    })

    it('clamps limit to maximum 100', async () => {
      // Arrange
      vi.mocked(mockAdminMembersService.listMembers).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 100, total: 0 },
      } as never)

      // Act
      await controller.listMembers(mockSession as never, 1, 999)

      // Assert
      expect(mockAdminMembersService.listMembers).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ limit: 100 })
      )
    })

    it('clamps limit to minimum 1', async () => {
      // Arrange
      vi.mocked(mockAdminMembersService.listMembers).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 1, total: 0 },
      } as never)

      // Act
      await controller.listMembers(mockSession as never, 1, 0)

      // Assert
      expect(mockAdminMembersService.listMembers).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ limit: 1 })
      )
    })

    it('passes search parameter through', async () => {
      // Arrange
      vi.mocked(mockAdminMembersService.listMembers).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0 },
      } as never)

      // Act
      await controller.listMembers(mockSession as never, 1, 20, 'alice')

      // Assert
      expect(mockAdminMembersService.listMembers).toHaveBeenCalledWith('org-1', {
        page: 1,
        limit: 20,
        search: 'alice',
      })
    })

    it('maps null user.name to empty string', async () => {
      // Arrange
      const member = makeMember({ user: { name: null, email: 'x@example.com' } })
      vi.mocked(mockAdminMembersService.listMembers).mockResolvedValue({
        data: [member],
        pagination: { page: 1, limit: 20, total: 1 },
      } as never)

      // Act
      const result = await controller.listMembers(mockSession as never, 1, 20)

      // Assert
      expect(result.data[0]!.name).toBe('')
    })
  })

  describe('decorator metadata', () => {
    const reflector = new Reflector()

    it('requires API key at controller level', () => {
      // Arrange & Act
      const metadata = reflector.get('REQUIRE_API_KEY', V1MembersController)

      // Assert
      expect(metadata).toBe(true)
    })

    it('applies V1ExceptionFilter at controller level', () => {
      // Arrange & Act
      const filters = reflector.get('__exceptionFilters__', V1MembersController)

      // Assert
      expect(filters).toContain(V1ExceptionFilter)
    })

    it('requires members:read permission on listMembers', () => {
      // Arrange & Act
      const metadata = reflector.get('PERMISSIONS', V1MembersController.prototype.listMembers)

      // Assert
      expect(metadata).toEqual(['members:read'])
    })

    it('requires members:delete permission on removeMember', () => {
      // Arrange & Act
      const metadata = reflector.get('PERMISSIONS', V1MembersController.prototype.removeMember)

      // Assert
      expect(metadata).toEqual(['members:delete'])
    })

    it('requires members:write permission on changeMemberRole', () => {
      // Arrange & Act
      const metadata = reflector.get('PERMISSIONS', V1MembersController.prototype.changeMemberRole)

      // Assert
      expect(metadata).toEqual(['members:write'])
    })
  })

  describe('removeMember', () => {
    it('calls adminMembersService.removeMember with memberId, orgId, userId', async () => {
      // Arrange
      vi.mocked(mockAdminMembersService.removeMember).mockResolvedValue(undefined as never)

      // Act
      const result = await controller.removeMember('member-1', mockSession as never)

      // Assert
      expect(result).toBeUndefined()
      expect(mockAdminMembersService.removeMember).toHaveBeenCalledWith(
        'member-1',
        'org-1',
        'user-1'
      )
    })

    it('propagates errors from service', async () => {
      // Arrange
      vi.mocked(mockAdminMembersService.removeMember).mockRejectedValue(
        new Error('Member not found')
      )

      // Act & Assert
      await expect(controller.removeMember('m-missing', mockSession as never)).rejects.toThrow(
        'Member not found'
      )
    })
  })

  describe('changeMemberRole', () => {
    it('calls adminMembersService.changeMemberRole with correct args and returns void', async () => {
      // Arrange
      vi.mocked(mockAdminMembersService.changeMemberRole).mockResolvedValue(undefined as never)

      // Act
      const result = await controller.changeMemberRole(
        'member-1',
        { roleId: 'role-uuid-1234' },
        mockSession as never
      )

      // Assert
      expect(result).toBeUndefined()
      expect(mockAdminMembersService.changeMemberRole).toHaveBeenCalledWith(
        'member-1',
        'org-1',
        { roleId: 'role-uuid-1234' },
        'user-1'
      )
    })

    it('propagates errors from service', async () => {
      // Arrange
      vi.mocked(mockAdminMembersService.changeMemberRole).mockRejectedValue(
        new Error('Role not found')
      )

      // Act & Assert
      await expect(
        controller.changeMemberRole('member-1', { roleId: 'bad-role' }, mockSession as never)
      ).rejects.toThrow('Role not found')
    })
  })
})
