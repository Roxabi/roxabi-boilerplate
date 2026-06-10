import { describe, expect, it, vi } from 'vitest'
import { GdprService } from './gdpr.service.js'
import type { GdprExportRepository } from './repositories/gdprExport.repository.js'

const mockUserData = [
  {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    image: 'https://example.com/avatar.png',
    role: 'user',
    emailVerified: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
]

const mockSessionData = [
  {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    expiresAt: new Date('2026-07-01T00:00:00Z'),
  },
]

const mockAccountData = [
  {
    providerId: 'google',
    scope: 'openid email profile',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
]

const mockOrgData = [
  {
    name: 'Test Organization',
    role: 'member',
    joinedAt: new Date('2026-01-15T00:00:00Z'),
  },
]

const mockConsentData = [
  {
    categories: { necessary: true, analytics: false, marketing: false },
    action: 'rejected',
    consentedAt: new Date('2026-02-17T12:00:00Z'),
    policyVersion: '2026-02-v1',
  },
]

const mockInvitations = [
  {
    email: 'invitee@example.com',
    organizationName: 'Test Organization',
    role: 'member',
    status: 'pending',
    direction: 'sent' as const,
  },
  {
    email: 'ada@example.com',
    organizationName: 'Other Org',
    role: 'admin',
    status: 'accepted',
    direction: 'received' as const,
  },
]

function createMockExportRepo(
  overrides: {
    userData?: unknown[]
    sessionData?: unknown[]
    accountData?: unknown[]
    orgData?: unknown[]
    consentData?: unknown[]
    invitations?: unknown[]
  } = {}
): GdprExportRepository {
  const userData = overrides.userData ?? mockUserData
  const sessionData = overrides.sessionData ?? mockSessionData
  const accountData = overrides.accountData ?? mockAccountData
  const orgData = overrides.orgData ?? mockOrgData
  const consentData = overrides.consentData ?? mockConsentData
  const invitations = overrides.invitations ?? mockInvitations

  return {
    fetchUserRecord: vi.fn().mockResolvedValue(userData),
    fetchCoreUserData: vi
      .fn()
      .mockResolvedValue([userData, sessionData, accountData, orgData, consentData]),
    fetchAndDeduplicateInvitations: vi.fn().mockResolvedValue(invitations),
  } as unknown as GdprExportRepository
}

describe('GdprService', () => {
  describe('exportUserData', () => {
    it('should include exportedAt as an ISO 8601 timestamp', async () => {
      // Arrange
      const exportRepo = createMockExportRepo()
      const service = new GdprService(exportRepo as never)

      // Act
      const result = await service.exportUserData('user-1')

      // Assert
      expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should include user profile with name, email, image, role', async () => {
      // Arrange
      const exportRepo = createMockExportRepo()
      const service = new GdprService(exportRepo as never)

      // Act
      const result = await service.exportUserData('user-1')

      // Assert
      expect(result.user).toEqual(
        expect.objectContaining({
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          image: 'https://example.com/avatar.png',
          role: 'user',
        })
      )
    })

    it('should include sessions with ipAddress, userAgent, and dates', async () => {
      // Arrange
      const exportRepo = createMockExportRepo()
      const service = new GdprService(exportRepo as never)

      // Act
      const result = await service.exportUserData('user-1')

      // Assert
      expect(result.sessions).toHaveLength(1)
      expect(result.sessions[0]).toEqual(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      )
    })

    it('should include accounts with providerId and scope only', async () => {
      // Arrange
      const exportRepo = createMockExportRepo()
      const service = new GdprService(exportRepo as never)

      // Act
      const result = await service.exportUserData('user-1')

      // Assert
      expect(result.accounts).toHaveLength(1)
      expect(result.accounts[0]).toEqual(
        expect.objectContaining({
          providerId: 'google',
          scope: 'openid email profile',
        })
      )
    })

    it('should NOT include passwords or OAuth tokens in accounts', async () => {
      // Arrange
      const exportRepo = createMockExportRepo()
      const service = new GdprService(exportRepo as never)

      // Act
      const result = await service.exportUserData('user-1')

      // Assert — the select clause only picks providerId, scope, createdAt
      for (const account of result.accounts) {
        expect(account).not.toHaveProperty('accessToken')
        expect(account).not.toHaveProperty('refreshToken')
        expect(account).not.toHaveProperty('idToken')
        expect(account).not.toHaveProperty('password')
      }
    })

    it('should NOT include session tokens in sessions', async () => {
      // Arrange
      const exportRepo = createMockExportRepo()
      const service = new GdprService(exportRepo as never)

      // Act
      const result = await service.exportUserData('user-1')

      // Assert
      for (const session of result.sessions) {
        expect(session).not.toHaveProperty('token')
      }
    })

    it('should include consent records without ipAddress and userAgent', async () => {
      // Arrange
      const exportRepo = createMockExportRepo()
      const service = new GdprService(exportRepo as never)

      // Act
      const result = await service.exportUserData('user-1')

      // Assert
      expect(result.consent).toHaveLength(1)
      expect(result.consent[0]).toEqual(
        expect.objectContaining({
          categories: { necessary: true, analytics: false, marketing: false },
          action: 'rejected',
          policyVersion: '2026-02-v1',
        })
      )
      for (const consent of result.consent) {
        expect(consent).not.toHaveProperty('ipAddress')
        expect(consent).not.toHaveProperty('userAgent')
      }
    })

    it('should include organizations the user belongs to', async () => {
      // Arrange
      const exportRepo = createMockExportRepo()
      const service = new GdprService(exportRepo as never)

      // Act
      const result = await service.exportUserData('user-1')

      // Assert
      expect(result.organizations).toHaveLength(1)
      expect(result.organizations[0]).toEqual(
        expect.objectContaining({
          name: 'Test Organization',
          role: 'member',
        })
      )
    })

    it('should include invitations with computed direction field', async () => {
      // Arrange
      const exportRepo = createMockExportRepo()
      const service = new GdprService(exportRepo as never)

      // Act
      const result = await service.exportUserData('user-1')

      // Assert
      expect(result.invitations.length).toBeGreaterThan(0)
      const sentInvitation = result.invitations.find((i) => i.direction === 'sent')
      const receivedInvitation = result.invitations.find((i) => i.direction === 'received')
      expect(sentInvitation).toBeDefined()
      expect(receivedInvitation).toBeDefined()
    })

    it('should return empty user object when user is not found', async () => {
      // Arrange
      const exportRepo = createMockExportRepo({ userData: [] })
      const service = new GdprService(exportRepo as never)

      // Act
      const result = await service.exportUserData('nonexistent')

      // Assert
      expect(result.user).toEqual({})
    })
  })
})
