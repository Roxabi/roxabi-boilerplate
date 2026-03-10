import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PermissionService } from '../rbac/permission.service.js'
import type { AuthService } from './auth.service.js'
import { SessionEnrichmentService } from './sessionEnrichment.service.js'

const mockGetRawSession = vi.fn()
const mockGetPermissions = vi.fn()

const mockAuthService = {
  getRawSession: mockGetRawSession,
} as unknown as AuthService

const mockPermissionService = {
  getPermissions: mockGetPermissions,
} as unknown as PermissionService

function createService() {
  return new SessionEnrichmentService(mockAuthService, mockPermissionService)
}

describe('SessionEnrichmentService', () => {
  beforeEach(() => {
    mockGetRawSession.mockReset()
    mockGetPermissions.mockReset().mockResolvedValue([])
  })

  it('should return null when no session exists', async () => {
    // Arrange
    const service = createService()
    mockGetRawSession.mockResolvedValue(null)

    // Act
    const result = await service.getEnrichedSession({ headers: {} } as never)

    // Assert
    expect(result).toBeNull()
    expect(mockGetPermissions).not.toHaveBeenCalled()
  })

  it('should return session with empty permissions when no activeOrganizationId', async () => {
    // Arrange
    const service = createService()
    const mockSession = {
      user: { id: 'user-1' },
      session: { id: 'sess-1' },
    }
    mockGetRawSession.mockResolvedValue(mockSession)

    // Act
    const result = await service.getEnrichedSession({ headers: {} } as never)

    // Assert
    expect(mockGetPermissions).not.toHaveBeenCalled()
    expect(result).toEqual({ ...mockSession, permissions: [] })
  })

  it('should enrich session with permissions when activeOrganizationId and user.id exist', async () => {
    // Arrange
    const service = createService()
    const mockSession = {
      user: { id: 'user-1' },
      session: { id: 'sess-1', activeOrganizationId: 'org-1' },
    }
    mockGetRawSession.mockResolvedValue(mockSession)
    mockGetPermissions.mockResolvedValue(['roles:read', 'members:write'])

    // Act
    const result = await service.getEnrichedSession({ headers: {} } as never)

    // Assert
    expect(mockGetPermissions).toHaveBeenCalledWith('user-1', 'org-1')
    expect(result).toEqual({ ...mockSession, permissions: ['roles:read', 'members:write'] })
  })

  it('should return empty permissions when activeOrganizationId exists but user.id is missing', async () => {
    // Arrange
    const service = createService()
    const mockSession = {
      user: {},
      session: { id: 'sess-1', activeOrganizationId: 'org-1' },
    }
    mockGetRawSession.mockResolvedValue(mockSession)

    // Act
    const result = await service.getEnrichedSession({ headers: {} } as never)

    // Assert
    expect(mockGetPermissions).not.toHaveBeenCalled()
    expect(result).toEqual({ ...mockSession, permissions: [] })
  })
})
