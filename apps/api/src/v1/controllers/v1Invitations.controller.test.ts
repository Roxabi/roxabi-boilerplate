import { Reflector } from '@nestjs/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminInvitationsService } from '../../admin/adminInvitations.service.js'
import { V1ExceptionFilter } from '../filters/v1Exception.filter.js'
import { V1InvitationsController } from './v1Invitations.controller.js'

const mockAdminInvitationsService: AdminInvitationsService = {
  listPendingInvitations: vi.fn(),
  inviteMember: vi.fn(),
  revokeInvitation: vi.fn(),
} as unknown as AdminInvitationsService

describe('V1InvitationsController', () => {
  const controller = new V1InvitationsController(mockAdminInvitationsService)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockSession = {
    user: { id: 'user-1' },
    session: { activeOrganizationId: 'org-1' },
  }

  // 7 days in ms — matches INVITATION_TTL_MS in controller
  const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

  const makeInvitation = (overrides = {}) => {
    const expiresAt = new Date('2024-07-15T00:00:00.000Z')
    return {
      id: 'inv-1',
      email: 'alice@example.com',
      role: 'member',
      status: 'pending',
      expiresAt,
      ...overrides,
    }
  }

  describe('listPendingInvitations', () => {
    it('calls adminInvitationsService.listPendingInvitations with orgId', async () => {
      // Arrange
      vi.mocked(mockAdminInvitationsService.listPendingInvitations).mockResolvedValue({
        data: [],
      } as never)

      // Act
      await controller.listPendingInvitations(mockSession as never)

      // Assert
      expect(mockAdminInvitationsService.listPendingInvitations).toHaveBeenCalledWith('org-1')
    })

    it('maps invitations to V1InvitationResponse[]', async () => {
      // Arrange
      const expiresAt = new Date('2024-07-15T00:00:00.000Z')
      const invitation = makeInvitation({ expiresAt })
      vi.mocked(mockAdminInvitationsService.listPendingInvitations).mockResolvedValue({
        data: [invitation],
      } as never)

      // Act
      const result = await controller.listPendingInvitations(mockSession as never)

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'inv-1',
        email: 'alice@example.com',
        role: 'member',
        status: 'pending',
        invitedAt: new Date(expiresAt.getTime() - INVITATION_TTL_MS).toISOString(),
        expiresAt: expiresAt.toISOString(),
      })
    })

    it('returns empty array when no pending invitations', async () => {
      // Arrange
      vi.mocked(mockAdminInvitationsService.listPendingInvitations).mockResolvedValue({
        data: [],
      } as never)

      // Act
      const result = await controller.listPendingInvitations(mockSession as never)

      // Assert
      expect(result).toEqual([])
    })

    it('computes invitedAt as expiresAt minus 7 days', async () => {
      // Arrange
      const expiresAt = new Date('2024-08-01T12:00:00.000Z')
      const expectedInvitedAt = new Date('2024-07-25T12:00:00.000Z')
      vi.mocked(mockAdminInvitationsService.listPendingInvitations).mockResolvedValue({
        data: [makeInvitation({ expiresAt })],
      } as never)

      // Act
      const result = await controller.listPendingInvitations(mockSession as never)

      // Assert
      expect(result[0]!.invitedAt).toBe(expectedInvitedAt.toISOString())
    })
  })

  describe('inviteMember', () => {
    it('calls adminInvitationsService.inviteMember with orgId, body, userId', async () => {
      // Arrange
      const expiresAt = new Date('2024-07-15T00:00:00.000Z')
      const invitation = makeInvitation({ expiresAt })
      vi.mocked(mockAdminInvitationsService.inviteMember).mockResolvedValue(invitation as never)

      // Act
      const result = await controller.inviteMember(
        { email: 'alice@example.com', roleId: 'role-uuid' },
        mockSession as never
      )

      // Assert
      expect(mockAdminInvitationsService.inviteMember).toHaveBeenCalledWith(
        'org-1',
        { email: 'alice@example.com', roleId: 'role-uuid' },
        'user-1'
      )
      expect(result).toMatchObject({
        id: 'inv-1',
        email: 'alice@example.com',
        role: 'member',
        status: 'pending',
      })
    })

    it('throws if invitation service returns null/undefined', async () => {
      // Arrange
      vi.mocked(mockAdminInvitationsService.inviteMember).mockResolvedValue(null as never)

      // Act & Assert
      await expect(
        controller.inviteMember(
          { email: 'alice@example.com', roleId: 'role-uuid' },
          mockSession as never
        )
      ).rejects.toThrow('Invitation creation failed')
    })

    it('propagates errors from service', async () => {
      // Arrange
      vi.mocked(mockAdminInvitationsService.inviteMember).mockRejectedValue(
        new Error('Already pending')
      )

      // Act & Assert
      await expect(
        controller.inviteMember(
          { email: 'alice@example.com', roleId: 'role-uuid' },
          mockSession as never
        )
      ).rejects.toThrow('Already pending')
    })
  })

  describe('decorator metadata', () => {
    const reflector = new Reflector()

    it('requires API key at controller level', () => {
      // Arrange & Act
      const metadata = reflector.get('REQUIRE_API_KEY', V1InvitationsController)

      // Assert
      expect(metadata).toBe(true)
    })

    it('applies V1ExceptionFilter at controller level', () => {
      // Arrange & Act
      const filters = reflector.get('__exceptionFilters__', V1InvitationsController)

      // Assert
      expect(filters).toContain(V1ExceptionFilter)
    })

    it('requires members:read permission on listPendingInvitations', () => {
      // Arrange & Act
      const metadata = reflector.get(
        'PERMISSIONS',
        V1InvitationsController.prototype.listPendingInvitations
      )

      // Assert
      expect(metadata).toEqual(['members:read'])
    })

    it('requires members:write permission on inviteMember', () => {
      // Arrange & Act
      const metadata = reflector.get('PERMISSIONS', V1InvitationsController.prototype.inviteMember)

      // Assert
      expect(metadata).toEqual(['members:write'])
    })

    it('requires members:delete permission on revokeInvitation', () => {
      // Arrange & Act
      const metadata = reflector.get(
        'PERMISSIONS',
        V1InvitationsController.prototype.revokeInvitation
      )

      // Assert
      expect(metadata).toEqual(['members:delete'])
    })
  })

  describe('revokeInvitation', () => {
    it('calls adminInvitationsService.revokeInvitation with id, orgId, userId', async () => {
      // Arrange
      vi.mocked(mockAdminInvitationsService.revokeInvitation).mockResolvedValue(undefined as never)

      // Act
      const result = await controller.revokeInvitation('inv-1', mockSession as never)

      // Assert
      expect(result).toBeUndefined()
      expect(mockAdminInvitationsService.revokeInvitation).toHaveBeenCalledWith(
        'inv-1',
        'org-1',
        'user-1'
      )
    })

    it('propagates errors from service', async () => {
      // Arrange
      vi.mocked(mockAdminInvitationsService.revokeInvitation).mockRejectedValue(
        new Error('Invitation not found')
      )

      // Act & Assert
      await expect(
        controller.revokeInvitation('inv-missing', mockSession as never)
      ).rejects.toThrow('Invitation not found')
    })
  })
})
