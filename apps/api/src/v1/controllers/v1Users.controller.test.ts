import { Reflector } from '@nestjs/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserService } from '../../user/user.service.js'
import { V1ExceptionFilter } from '../filters/v1Exception.filter.js'
import { V1UsersController } from './v1Users.controller.js'

const mockUserService: UserService = {
  getProfile: vi.fn(),
} as unknown as UserService

describe('V1UsersController', () => {
  const controller = new V1UsersController(mockUserService)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockSession = {
    user: { id: 'user-1' },
    session: { activeOrganizationId: 'org-1' },
  }

  describe('decorator metadata', () => {
    const reflector = new Reflector()

    it('requires API key at controller level', () => {
      // Arrange & Act
      const metadata = reflector.get('REQUIRE_API_KEY', V1UsersController)

      // Assert
      expect(metadata).toBe(true)
    })

    it('applies V1ExceptionFilter at controller level', () => {
      // Arrange & Act
      const filters = reflector.get('__exceptionFilters__', V1UsersController)

      // Assert
      expect(filters).toContain(V1ExceptionFilter)
    })

    it('requires users:read permission on getMe', () => {
      // Arrange & Act
      const metadata = reflector.get('PERMISSIONS', V1UsersController.prototype.getMe)

      // Assert
      expect(metadata).toEqual(['users:read'])
    })
  })

  describe('getMe', () => {
    it('returns V1UserMeResponse with fullName when available', async () => {
      // Arrange
      vi.mocked(mockUserService.getProfile).mockResolvedValue({
        id: 'user-1',
        fullName: 'Alice Smith',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        image: 'https://example.com/avatar.png',
      } as never)

      // Act
      const result = await controller.getMe(mockSession as never)

      // Assert
      expect(result).toEqual({
        id: 'user-1',
        name: 'Alice Smith',
        email: 'alice@example.com',
        image: 'https://example.com/avatar.png',
      })
      expect(mockUserService.getProfile).toHaveBeenCalledWith('user-1')
    })

    it('falls back to firstName + lastName when fullName is null', async () => {
      // Arrange
      vi.mocked(mockUserService.getProfile).mockResolvedValue({
        id: 'user-1',
        fullName: null,
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob@example.com',
        image: null,
      } as never)

      // Act
      const result = await controller.getMe(mockSession as never)

      // Assert
      expect(result.name).toBe('Bob Jones')
    })

    it('falls back to firstName only when lastName is null', async () => {
      // Arrange
      vi.mocked(mockUserService.getProfile).mockResolvedValue({
        id: 'user-1',
        fullName: null,
        firstName: 'Carol',
        lastName: null,
        email: null,
        image: null,
      } as never)

      // Act
      const result = await controller.getMe(mockSession as never)

      // Assert
      expect(result.name).toBe('Carol')
    })

    it('returns empty string name when all name fields are null', async () => {
      // Arrange
      vi.mocked(mockUserService.getProfile).mockResolvedValue({
        id: 'user-1',
        fullName: null,
        firstName: null,
        lastName: null,
        email: null,
        image: null,
      } as never)

      // Act
      const result = await controller.getMe(mockSession as never)

      // Assert
      expect(result.name).toBe('')
    })

    it('returns null for email and image when not set', async () => {
      // Arrange
      vi.mocked(mockUserService.getProfile).mockResolvedValue({
        id: 'user-1',
        fullName: 'Dave',
        firstName: null,
        lastName: null,
        email: null,
        image: null,
      } as never)

      // Act
      const result = await controller.getMe(mockSession as never)

      // Assert
      expect(result.email).toBeNull()
      expect(result.image).toBeNull()
    })

    it('propagates errors from userService.getProfile', async () => {
      // Arrange
      vi.mocked(mockUserService.getProfile).mockRejectedValue(new Error('Profile not found'))

      // Act & Assert
      await expect(controller.getMe(mockSession as never)).rejects.toThrow('Profile not found')
    })
  })
})
