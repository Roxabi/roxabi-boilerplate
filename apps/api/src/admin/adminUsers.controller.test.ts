import { Reflector } from '@nestjs/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminUsersController, banUserSchema, updateUserSchema } from './adminUsers.controller.js'
import type { AdminUsersLifecycleService } from './adminUsers.lifecycle.js'
import type { AdminUsersQueryService } from './adminUsers.query.js'
import type { AdminUsersService } from './adminUsers.service.js'
import { EmailConflictException } from './exceptions/emailConflict.exception.js'
import { UserAlreadyBannedException } from './exceptions/userAlreadyBanned.exception.js'
import { AdminUserNotFoundException } from './exceptions/userNotFound.exception.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockAdminUsersService: AdminUsersService = {
  getUserDetail: vi.fn(),
  updateUser: vi.fn(),
} as unknown as AdminUsersService

const mockAdminUsersQueryService: AdminUsersQueryService = {
  listUsers: vi.fn(),
} as unknown as AdminUsersQueryService

const mockAdminUsersLifecycleService: AdminUsersLifecycleService = {
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  deleteUser: vi.fn(),
  restoreUser: vi.fn(),
} as unknown as AdminUsersLifecycleService

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminUsersController', () => {
  const controller = new AdminUsersController(
    mockAdminUsersService,
    mockAdminUsersQueryService,
    mockAdminUsersLifecycleService
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
    const roles = reflector.get('ROLES', AdminUsersController)
    const skipOrg = reflector.get('SKIP_ORG', AdminUsersController)

    // Assert
    expect(roles).toEqual(['superadmin'])
    expect(skipOrg).toBe(true)
  })

  // -----------------------------------------------------------------------
  // GET /api/admin/users
  // -----------------------------------------------------------------------
  describe('GET /api/admin/users', () => {
    it('should delegate to service.listUsers with parsed filters and default limit', async () => {
      // Arrange
      const expected = { data: [], cursor: { next: null, hasMore: false } }
      vi.mocked(mockAdminUsersQueryService.listUsers).mockResolvedValue(expected)

      // Act
      const result = await controller.listUsers()

      // Assert
      expect(result).toEqual(expected)
      expect(mockAdminUsersQueryService.listUsers).toHaveBeenCalledWith(
        { role: undefined, status: undefined, organizationId: undefined, search: undefined },
        undefined,
        20
      )
    })

    it('should pass filter params to service', async () => {
      // Arrange
      vi.mocked(mockAdminUsersQueryService.listUsers).mockResolvedValue({
        data: [],
        cursor: { next: null, hasMore: false },
      })

      // Act
      await controller.listUsers(
        'cursor-abc',
        '10',
        'superadmin',
        'active',
        '00000000-0000-4000-8000-000000000001',
        'alice'
      )

      // Assert
      expect(mockAdminUsersQueryService.listUsers).toHaveBeenCalledWith(
        {
          role: 'superadmin',
          status: 'active',
          organizationId: '00000000-0000-4000-8000-000000000001',
          search: 'alice',
        },
        'cursor-abc',
        10
      )
    })

    it('should clamp limit to range [1, 100]', async () => {
      // Arrange
      vi.mocked(mockAdminUsersQueryService.listUsers).mockResolvedValue({
        data: [],
        cursor: { next: null, hasMore: false },
      })

      // Act — limit exceeds max
      await controller.listUsers(undefined, '500')

      // Assert
      expect(mockAdminUsersQueryService.listUsers).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        100
      )
    })

    it('should default limit to 20 when invalid value is provided', async () => {
      // Arrange
      vi.mocked(mockAdminUsersQueryService.listUsers).mockResolvedValue({
        data: [],
        cursor: { next: null, hasMore: false },
      })

      // Act
      await controller.listUsers(undefined, 'not-a-number')

      // Assert
      expect(mockAdminUsersQueryService.listUsers).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        20
      )
    })

    it('should trim search whitespace', async () => {
      // Arrange
      vi.mocked(mockAdminUsersQueryService.listUsers).mockResolvedValue({
        data: [],
        cursor: { next: null, hasMore: false },
      })

      // Act
      await controller.listUsers(undefined, undefined, undefined, undefined, undefined, '  alice  ')

      // Assert
      expect(mockAdminUsersQueryService.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'alice' }),
        undefined,
        20
      )
    })
  })

  // -----------------------------------------------------------------------
  // GET /api/admin/users/:userId
  // -----------------------------------------------------------------------
  describe('GET /api/admin/users/:userId', () => {
    it('should delegate to service.getUserDetail for valid UUID', async () => {
      // Arrange
      const detail = { user: { id: 'user-1' }, memberships: [], auditEntries: [] }
      vi.mocked(mockAdminUsersService.getUserDetail).mockResolvedValue(detail as never)

      // Act
      const result = await controller.getUserDetail('user-1')

      // Assert
      expect(result).toEqual(detail)
      expect(mockAdminUsersService.getUserDetail).toHaveBeenCalledWith('user-1')
    })

    it('should propagate AdminUserNotFoundException when user not found', async () => {
      // Arrange
      vi.mocked(mockAdminUsersService.getUserDetail).mockRejectedValue(
        new AdminUserNotFoundException('user-missing')
      )

      // Act & Assert
      await expect(controller.getUserDetail('user-missing')).rejects.toThrow(
        AdminUserNotFoundException
      )
    })
  })

  // -----------------------------------------------------------------------
  // PATCH /api/admin/users/:userId
  // -----------------------------------------------------------------------
  describe('PATCH /api/admin/users/:userId', () => {
    it('should delegate to service.updateUser with body and actor id', async () => {
      // Arrange
      const updatedUser = { id: 'user-1', name: 'New Name' }
      vi.mocked(mockAdminUsersService.updateUser).mockResolvedValue(updatedUser as never)
      const body = { name: 'New Name' }

      // Act
      const result = await controller.updateUser('user-1', mockSession as never, body)

      // Assert
      expect(result).toEqual(updatedUser)
      expect(mockAdminUsersService.updateUser).toHaveBeenCalledWith('user-1', body, 'superadmin-1')
    })

    it('should propagate EmailConflictException on duplicate email', async () => {
      // Arrange
      vi.mocked(mockAdminUsersService.updateUser).mockRejectedValue(new EmailConflictException())

      // Act & Assert
      await expect(
        controller.updateUser('user-1', mockSession as never, { email: 'taken@example.com' })
      ).rejects.toThrow(EmailConflictException)
    })

    it('should propagate AdminUserNotFoundException when user not found', async () => {
      // Arrange
      vi.mocked(mockAdminUsersService.updateUser).mockRejectedValue(
        new AdminUserNotFoundException('user-missing')
      )

      // Act & Assert
      await expect(
        controller.updateUser('user-missing', mockSession as never, { name: 'X' })
      ).rejects.toThrow(AdminUserNotFoundException)
    })
  })

  // -----------------------------------------------------------------------
  // PATCH /api/admin/users/:userId — Zod schema validation
  // -----------------------------------------------------------------------
  describe('updateUserSchema validation', () => {
    it('should accept valid update body with name, email, and role', () => {
      // Arrange
      const input = { name: 'Alice', email: 'alice@example.com', role: 'superadmin' }

      // Act
      const result = updateUserSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    it('should accept empty body (all fields optional)', () => {
      // Arrange & Act
      const result = updateUserSchema.safeParse({})

      // Assert
      expect(result.success).toBe(true)
    })

    it('should reject invalid email format', () => {
      // Arrange
      const input = { email: 'not-an-email' }

      // Act
      const result = updateUserSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    it('should reject invalid role value', () => {
      // Arrange
      const input = { role: 'mega-admin' }

      // Act
      const result = updateUserSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    it('should reject name with empty string', () => {
      // Arrange
      const input = { name: '' }

      // Act
      const result = updateUserSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    it('should reject name exceeding 255 characters', () => {
      // Arrange
      const input = { name: 'x'.repeat(256) }

      // Act
      const result = updateUserSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // POST /api/admin/users/:userId/ban — Zod schema validation
  // -----------------------------------------------------------------------
  describe('banUserSchema validation', () => {
    it('should accept valid ban body with reason', () => {
      // Arrange
      const input = { reason: 'Spam activity detected' }

      // Act
      const result = banUserSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    it('should reject reason shorter than 5 characters', () => {
      // Arrange
      const input = { reason: 'bad' }

      // Act
      const result = banUserSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    it('should reject reason longer than 500 characters', () => {
      // Arrange
      const input = { reason: 'x'.repeat(501) }

      // Act
      const result = banUserSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    it('should accept reason of exactly 5 characters', () => {
      // Arrange
      const input = { reason: 'spam!' }

      // Act
      const result = banUserSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    it('should accept reason of exactly 500 characters', () => {
      // Arrange
      const input = { reason: 'x'.repeat(500) }

      // Act
      const result = banUserSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    it('should accept null expires', () => {
      // Arrange
      const input = { reason: 'Spam activity', expires: null }

      // Act
      const result = banUserSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    it('should accept valid ISO datetime expires', () => {
      // Arrange
      const input = { reason: 'Temporary ban', expires: '2026-12-31T23:59:59.000Z' }

      // Act
      const result = banUserSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    it('should reject non-datetime string for expires', () => {
      // Arrange — schema now validates datetime format
      const input = { reason: 'Temporary ban', expires: 'not-a-date' }

      // Act
      const result = banUserSchema.safeParse(input)

      // Assert — schema-level rejects invalid datetime strings
      expect(result.success).toBe(false)
    })

    it('should reject missing reason', () => {
      // Arrange
      const input = {}

      // Act
      const result = banUserSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // POST /api/admin/users/:userId/ban
  // -----------------------------------------------------------------------
  describe('POST /api/admin/users/:userId/ban', () => {
    it('should delegate to service.banUser with parsed body', async () => {
      // Arrange
      const bannedUser = { id: 'user-1', banned: true }
      vi.mocked(mockAdminUsersLifecycleService.banUser).mockResolvedValue(bannedUser as never)
      const body = { reason: 'Spam activity', expires: null }

      // Act
      const result = await controller.banUser('user-1', mockSession as never, body)

      // Assert
      expect(result).toEqual(bannedUser)
      expect(mockAdminUsersLifecycleService.banUser).toHaveBeenCalledWith(
        'user-1',
        'Spam activity',
        null,
        'superadmin-1'
      )
    })

    it('should convert expires string to Date when provided', async () => {
      // Arrange
      vi.mocked(mockAdminUsersLifecycleService.banUser).mockResolvedValue({ id: 'user-1' } as never)
      const body = { reason: 'Temporary ban', expires: '2026-12-31T23:59:59.000Z' }

      // Act
      await controller.banUser('user-1', mockSession as never, body)

      // Assert
      expect(mockAdminUsersLifecycleService.banUser).toHaveBeenCalledWith(
        'user-1',
        'Temporary ban',
        new Date('2026-12-31T23:59:59.000Z'),
        'superadmin-1'
      )
    })

    it('should propagate UserAlreadyBannedException from service', async () => {
      // Arrange
      vi.mocked(mockAdminUsersLifecycleService.banUser).mockRejectedValue(
        new UserAlreadyBannedException('user-1')
      )

      // Act & Assert
      await expect(
        controller.banUser('user-1', mockSession as never, { reason: 'Spam again', expires: null })
      ).rejects.toThrow(UserAlreadyBannedException)
    })

    it('should propagate AdminUserNotFoundException from service', async () => {
      // Arrange
      vi.mocked(mockAdminUsersLifecycleService.banUser).mockRejectedValue(
        new AdminUserNotFoundException('user-missing')
      )

      // Act & Assert
      await expect(
        controller.banUser('user-missing', mockSession as never, {
          reason: 'Some reason',
          expires: null,
        })
      ).rejects.toThrow(AdminUserNotFoundException)
    })
  })

  // -----------------------------------------------------------------------
  // POST /api/admin/users/:userId/unban
  // -----------------------------------------------------------------------
  describe('POST /api/admin/users/:userId/unban', () => {
    it('should delegate to service.unbanUser', async () => {
      // Arrange
      const unbannedUser = { id: 'user-1', banned: false }
      vi.mocked(mockAdminUsersLifecycleService.unbanUser).mockResolvedValue(unbannedUser as never)

      // Act
      const result = await controller.unbanUser('user-1', mockSession as never)

      // Assert
      expect(result).toEqual(unbannedUser)
      expect(mockAdminUsersLifecycleService.unbanUser).toHaveBeenCalledWith(
        'user-1',
        'superadmin-1'
      )
    })

    it('should propagate AdminUserNotFoundException from service', async () => {
      // Arrange
      vi.mocked(mockAdminUsersLifecycleService.unbanUser).mockRejectedValue(
        new AdminUserNotFoundException('user-missing')
      )

      // Act & Assert
      await expect(controller.unbanUser('user-missing', mockSession as never)).rejects.toThrow(
        AdminUserNotFoundException
      )
    })
  })

  // -----------------------------------------------------------------------
  // DELETE /api/admin/users/:userId
  // -----------------------------------------------------------------------
  describe('DELETE /api/admin/users/:userId', () => {
    it('should delegate to service.deleteUser and return void (204)', async () => {
      // Arrange
      vi.mocked(mockAdminUsersLifecycleService.deleteUser).mockResolvedValue({
        id: 'user-1',
      } as never)

      // Act
      const result = await controller.deleteUser('user-1', mockSession as never)

      // Assert — controller returns void (204 No Content)
      expect(result).toBeUndefined()
      expect(mockAdminUsersLifecycleService.deleteUser).toHaveBeenCalledWith(
        'user-1',
        'superadmin-1'
      )
    })

    it('should propagate AdminUserNotFoundException from service', async () => {
      // Arrange
      vi.mocked(mockAdminUsersLifecycleService.deleteUser).mockRejectedValue(
        new AdminUserNotFoundException('user-missing')
      )

      // Act & Assert
      await expect(controller.deleteUser('user-missing', mockSession as never)).rejects.toThrow(
        AdminUserNotFoundException
      )
    })
  })

  // -----------------------------------------------------------------------
  // POST /api/admin/users/:userId/restore
  // -----------------------------------------------------------------------
  describe('POST /api/admin/users/:userId/restore', () => {
    it('should delegate to service.restoreUser', async () => {
      // Arrange
      const restoredUser = { id: 'user-1', deletedAt: null }
      vi.mocked(mockAdminUsersLifecycleService.restoreUser).mockResolvedValue(restoredUser as never)

      // Act
      const result = await controller.restoreUser('user-1', mockSession as never)

      // Assert
      expect(result).toEqual(restoredUser)
      expect(mockAdminUsersLifecycleService.restoreUser).toHaveBeenCalledWith(
        'user-1',
        'superadmin-1'
      )
    })

    it('should propagate AdminUserNotFoundException from service', async () => {
      // Arrange
      vi.mocked(mockAdminUsersLifecycleService.restoreUser).mockRejectedValue(
        new AdminUserNotFoundException('user-missing')
      )

      // Act & Assert
      await expect(controller.restoreUser('user-missing', mockSession as never)).rejects.toThrow(
        AdminUserNotFoundException
      )
    })
  })
})
