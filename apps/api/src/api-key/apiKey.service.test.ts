import { createHmac, randomBytes } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import type { AuthenticatedSession } from '../auth/types.js'
import { ErrorCode } from '../common/errorCodes.js'
import type { ApiKeyRepository } from './apiKey.repository.js'
import { ApiKeyService } from './apiKey.service.js'
import { ApiKeyExpiryInPastException } from './exceptions/apiKeyExpiryInPast.exception.js'
import { ApiKeyInvalidException } from './exceptions/apiKeyInvalid.exception.js'
import { ApiKeyNotFoundException } from './exceptions/apiKeyNotFound.exception.js'
import { ApiKeyScopesExceededException } from './exceptions/apiKeyScopesExceeded.exception.js'

// ---------------------------------------------------------------------------
// Helpers for validateBearerToken / touchLastUsedAt tests
// ---------------------------------------------------------------------------

function hmacHashHelper(key: string, salt: string): string {
  return createHmac('sha256', salt).update(key).digest('hex')
}

function buildValidToken(): { token: string; lastFour: string; salt: string; hash: string } {
  const token = `sk_live_${'a'.repeat(32)}`
  const lastFour = token.slice(-4)
  const salt = randomBytes(16).toString('hex')
  const hash = hmacHashHelper(token, salt)
  return { token, lastFour, salt, hash }
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createMockApiKeyRepo(): ApiKeyRepository {
  return {
    insert: vi.fn(),
    list: vi.fn(),
    findForRevoke: vi.fn(),
    markRevoked: vi.fn(),
    findCandidatesByLastFour: vi.fn(),
    touchLastUsedAt: vi.fn().mockResolvedValue(undefined),
    revokeAllForUser: vi.fn().mockResolvedValue(undefined),
    revokeAllForOrg: vi.fn().mockResolvedValue(undefined),
  } as unknown as ApiKeyRepository
}

function createMockAuditService() {
  return { log: vi.fn().mockResolvedValue(undefined) }
}

function createMockCls(tenantId: string | null = 'tenant-uuid-1') {
  return {
    getId: vi.fn().mockReturnValue('cls-correlation-id'),
    get: vi.fn().mockImplementation((key: string) => {
      if (key === 'tenantId') return tenantId
      return
    }),
  }
}

function createSession(overrides: Partial<AuthenticatedSession> = {}): AuthenticatedSession {
  return {
    user: { id: 'user-1' },
    session: { id: 'sess-1', activeOrganizationId: 'org-1' },
    permissions: ['api_keys:read', 'api_keys:write', 'billing:read'],
    actorType: 'user',
    ...overrides,
  }
}

function createService(
  repoOverride?: ApiKeyRepository,
  auditOverride?: ReturnType<typeof createMockAuditService>,
  clsOverride?: ReturnType<typeof createMockCls>
) {
  const repo = repoOverride ?? createMockApiKeyRepo()
  const audit = auditOverride ?? createMockAuditService()
  const cls = clsOverride ?? createMockCls()
  return new ApiKeyService(repo as never, audit as never, cls as never)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ApiKeyService', () => {
  // -----------------------------------------------------------------------
  // create()
  // -----------------------------------------------------------------------
  describe('create()', () => {
    it('should return a full key starting with sk_live_ prefix', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      const insertedRow = {
        id: 'key-1',
        name: 'My Key',
        keyPrefix: 'sk_live_',
        lastFour: 'abcd',
        scopes: ['api_keys:read'],
        expiresAt: null,
        createdAt: new Date(),
      }
      ;(mockRepo.insert as ReturnType<typeof vi.fn>).mockResolvedValue(insertedRow)
      const service = createService(mockRepo)

      // Act
      const result = await service.create(createSession(), {
        name: 'My Key',
        scopes: ['api_keys:read'],
      })

      // Assert
      expect(result.key).toMatch(/^sk_live_[a-zA-Z0-9]{32}$/)
    })

    it('should insert a row with HMAC-hashed key and salt', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      const insertedRow = {
        id: 'key-1',
        name: 'My Key',
        keyPrefix: 'sk_live_',
        lastFour: 'xxxx',
        scopes: ['api_keys:read'],
        expiresAt: null,
        createdAt: new Date(),
      }
      ;(mockRepo.insert as ReturnType<typeof vi.fn>).mockResolvedValue(insertedRow)
      const service = createService(mockRepo)

      // Act
      await service.create(createSession(), {
        name: 'My Key',
        scopes: ['api_keys:read'],
      })

      // Assert
      expect(mockRepo.insert).toHaveBeenCalledOnce()
      const insertedValues = (mockRepo.insert as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Record<string, unknown>
      expect(insertedValues.keyHash).toEqual(expect.any(String))
      expect(insertedValues.keySalt).toEqual(expect.any(String))
      expect(insertedValues.keyPrefix).toBe('sk_live_')
      expect(insertedValues.tenantId).toBe('org-1')
      expect(insertedValues.userId).toBe('user-1')
      expect(insertedValues.name).toBe('My Key')
      expect(insertedValues.scopes).toEqual(['api_keys:read'])
      // Hash is a 64-char hex string (SHA-256)
      expect(insertedValues.keyHash).toMatch(/^[a-f0-9]{64}$/)
      // Salt is a 32-char hex string (16 bytes)
      expect(insertedValues.keySalt).toMatch(/^[a-f0-9]{32}$/)
    })

    it('should store lastFour as last 4 characters of the full key', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.insert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'key-1',
        name: 'K',
        keyPrefix: 'sk_live_',
        lastFour: 'xxxx',
        scopes: [],
        expiresAt: null,
        createdAt: new Date(),
      })
      const audit = createMockAuditService()
      const service = createService(mockRepo, audit)

      // Act
      const result = await service.create(createSession({ permissions: [] }), {
        name: 'K',
        scopes: [],
      })

      // Assert
      const insertedValues = (mockRepo.insert as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Record<string, unknown>
      const fullKey = result.key as string
      expect(insertedValues.lastFour).toBe(fullKey.slice(-4))
    })

    it('should call auditService.log with api_key.created action', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.insert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'key-1',
        name: 'Audit Test',
        keyPrefix: 'sk_live_',
        lastFour: 'abcd',
        scopes: ['api_keys:read'],
        expiresAt: null,
        createdAt: new Date(),
      })
      const audit = createMockAuditService()
      const service = createService(mockRepo, audit)

      // Act
      await service.create(createSession(), {
        name: 'Audit Test',
        scopes: ['api_keys:read'],
      })

      // Assert
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-1',
          actorType: 'user',
          organizationId: 'org-1',
          action: 'api_key.created',
          resource: 'api_key',
          resourceId: expect.any(String),
          apiKeyId: expect.any(String),
          after: {
            name: 'Audit Test',
            scopes: ['api_keys:read'],
            expiresAt: null,
          },
        })
      )
      // Verify the apiKeyId and resourceId are valid UUIDs (same value)
      const auditCall = audit.log.mock.calls[0]?.[0] as Record<string, unknown>
      expect(auditCall.apiKeyId).toBe(auditCall.resourceId)
      expect(auditCall.apiKeyId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      )
    })

    it('should parse expiresAt as a Date when provided', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.insert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'key-1',
        name: 'Expiring Key',
        keyPrefix: 'sk_live_',
        lastFour: 'abcd',
        scopes: [],
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        createdAt: new Date(),
      })
      const service = createService(mockRepo)

      // Act
      await service.create(createSession({ permissions: [] }), {
        name: 'Expiring Key',
        scopes: [],
        expiresAt: '2099-01-01T00:00:00.000Z',
      })

      // Assert
      const insertedValues = (mockRepo.insert as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Record<string, unknown>
      expect(insertedValues.expiresAt).toEqual(new Date('2099-01-01T00:00:00.000Z'))
    })

    it('should set expiresAt to null when not provided', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.insert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'key-1',
        name: 'No Expiry',
        keyPrefix: 'sk_live_',
        lastFour: 'abcd',
        scopes: [],
        expiresAt: null,
        createdAt: new Date(),
      })
      const service = createService(mockRepo)

      // Act
      await service.create(createSession({ permissions: [] }), { name: 'No Expiry', scopes: [] })

      // Assert
      const insertedValues = (mockRepo.insert as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Record<string, unknown>
      expect(insertedValues.expiresAt).toBeNull()
    })

    it('should throw ApiKeyExpiryInPastException when expiresAt is in the past', async () => {
      // Arrange
      const service = createService()

      // Act & Assert
      await expect(
        service.create(createSession({ permissions: [] }), {
          name: 'Past Key',
          scopes: [],
          expiresAt: '2000-01-01T00:00:00.000Z',
        })
      ).rejects.toThrow(ApiKeyExpiryInPastException)
    })

    it('should allow creating a key with empty scopes', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.insert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'key-1',
        name: 'Empty Scopes Key',
        keyPrefix: 'sk_live_',
        lastFour: 'abcd',
        scopes: [],
        expiresAt: null,
        createdAt: new Date(),
      })
      const service = createService(mockRepo)

      // Act
      const result = await service.create(createSession(), {
        name: 'Empty Scopes Key',
        scopes: [],
        expiresAt: null,
      })

      // Assert
      expect(result).toBeDefined()
      expect(result.key).toMatch(/^sk_live_/)
      const insertedValues = (mockRepo.insert as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Record<string, unknown>
      expect(insertedValues.scopes).toEqual([])
    })

    it('should throw ApiKeyScopesExceededException when scopes exceed permissions', async () => {
      // Arrange
      const service = createService()
      const session = createSession({ permissions: ['api_keys:read'] })

      // Act & Assert
      await expect(
        service.create(session, {
          name: 'Over-scoped',
          scopes: ['api_keys:read', 'admin:super_secret'],
        })
      ).rejects.toThrow(ApiKeyScopesExceededException)
    })

    it('should not throw when scopes are a subset of permissions', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.insert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'key-1',
        name: 'Valid Scopes',
        keyPrefix: 'sk_live_',
        lastFour: 'abcd',
        scopes: ['api_keys:read'],
        expiresAt: null,
        createdAt: new Date(),
      })
      const service = createService(mockRepo)
      const session = createSession({ permissions: ['api_keys:read', 'api_keys:write'] })

      // Act
      const result = await service.create(session, {
        name: 'Valid Scopes',
        scopes: ['api_keys:read'],
      })

      // Assert
      expect(result).toBeDefined()
    })

    it('should throw Error when session has no activeOrganizationId', async () => {
      // Arrange
      const service = createService()
      const session = createSession({
        session: { id: 'sess-1', activeOrganizationId: null },
      })

      // Act & Assert
      await expect(service.create(session, { name: 'No Org', scopes: [] })).rejects.toThrow(
        'Active organization required'
      )
    })

    it('should generate unique keys on each call', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.insert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'key-1',
        name: 'K',
        keyPrefix: 'sk_live_',
        lastFour: 'abcd',
        scopes: [],
        expiresAt: null,
        createdAt: new Date(),
      })
      const service = createService(mockRepo)
      const session = createSession({ permissions: [] })

      // Act
      const result1 = await service.create(session, { name: 'K', scopes: [] })
      const result2 = await service.create(session, { name: 'K', scopes: [] })

      // Assert
      expect(result1.key).not.toBe(result2.key)
    })
  })

  // -----------------------------------------------------------------------
  // list()
  // -----------------------------------------------------------------------
  describe('list()', () => {
    it('should return data array from the database', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      const rows = [
        {
          id: 'key-1',
          name: 'Key One',
          keyPrefix: 'sk_live_',
          lastFour: 'aaaa',
          scopes: ['api_keys:read'],
          rateLimitTier: 'standard',
          expiresAt: null,
          lastUsedAt: null,
          revokedAt: null,
          createdAt: new Date(),
        },
      ]
      ;(mockRepo.list as ReturnType<typeof vi.fn>).mockResolvedValue(rows)
      const service = createService(mockRepo)

      // Act
      const result = await service.list(createSession())

      // Assert
      expect(result).toEqual({ data: rows })
    })

    it('should return empty data array when no keys exist', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.list as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const service = createService(mockRepo)

      // Act
      const result = await service.list(createSession())

      // Assert
      expect(result).toEqual({ data: [] })
    })

    it('should query by tenantId matching the orgId', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.list as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const service = createService(mockRepo)

      // Act
      await service.list(
        createSession({ session: { id: 'sess-1', activeOrganizationId: 'org-42' } })
      )

      // Assert
      expect(mockRepo.list).toHaveBeenCalledOnce()
      expect(mockRepo.list).toHaveBeenCalledWith('org-42')
    })

    it('should throw Error when session has no activeOrganizationId', async () => {
      // Arrange
      const service = createService()
      const session = createSession({
        session: { id: 'sess-1', activeOrganizationId: null },
      })

      // Act & Assert
      await expect(service.list(session)).rejects.toThrow('Active organization required')
    })
  })

  // -----------------------------------------------------------------------
  // revoke()
  // -----------------------------------------------------------------------
  describe('revoke()', () => {
    it('should revoke an existing active key and return revocation timestamp', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.findForRevoke as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'key-1',
        revokedAt: null,
      })
      ;(mockRepo.markRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const audit = createMockAuditService()
      const service = createService(mockRepo, audit)

      // Act
      const result = await service.revoke('key-1', createSession())

      // Assert
      expect(result.id).toBe('key-1')
      expect(result.revokedAt).toEqual(expect.any(String))
      // Verify it is a valid ISO string
      expect(new Date(result.revokedAt).toISOString()).toBe(result.revokedAt)
    })

    it('should call repo.markRevoked to set revokedAt', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.findForRevoke as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'key-1',
        revokedAt: null,
      })
      ;(mockRepo.markRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const service = createService(mockRepo)

      // Act
      await service.revoke('key-1', createSession())

      // Assert
      expect(mockRepo.markRevoked).toHaveBeenCalledOnce()
      // biome-ignore lint/style/noNonNullAssertion: verified toHaveBeenCalledOnce above
      const markRevokedArgs = (mockRepo.markRevoked as ReturnType<typeof vi.fn>).mock.calls[0]!
      expect(markRevokedArgs[0]).toBe('key-1')
      expect(markRevokedArgs[1]).toBe('org-1')
      expect(markRevokedArgs[2]).toBeInstanceOf(Date)
    })

    it('should log api_key.revoked audit event', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.findForRevoke as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'key-1',
        revokedAt: null,
      })
      ;(mockRepo.markRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const audit = createMockAuditService()
      const service = createService(mockRepo, audit)

      // Act
      await service.revoke('key-1', createSession())

      // Assert
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-1',
          organizationId: 'org-1',
          action: 'api_key.revoked',
          resource: 'api_key',
          resourceId: 'key-1',
        })
      )
    })

    it('should be idempotent when key is already revoked', async () => {
      // Arrange
      const revokedAt = new Date('2024-06-01T00:00:00.000Z')
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.findForRevoke as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'key-1',
        revokedAt,
      })
      const audit = createMockAuditService()
      const service = createService(mockRepo, audit)

      // Act
      const result = await service.revoke('key-1', createSession())

      // Assert
      expect(result).toEqual({ id: 'key-1', revokedAt: revokedAt.toISOString() })
      // Should NOT update or log again
      expect(mockRepo.markRevoked).not.toHaveBeenCalled()
      expect(audit.log).not.toHaveBeenCalled()
    })

    it('should throw ApiKeyNotFoundException when key does not exist', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.findForRevoke as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const service = createService(mockRepo)

      // Act & Assert
      await expect(service.revoke('nonexistent', createSession())).rejects.toThrow(
        ApiKeyNotFoundException
      )
    })

    it('should throw ApiKeyNotFoundException with the key id in the message', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.findForRevoke as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const service = createService(mockRepo)

      // Act & Assert
      await expect(service.revoke('key-xyz', createSession())).rejects.toThrow(
        'API key "key-xyz" not found'
      )
    })

    it('should throw Error when session has no activeOrganizationId', async () => {
      // Arrange
      const service = createService()
      const session = createSession({
        session: { id: 'sess-1', activeOrganizationId: null },
      })

      // Act & Assert
      await expect(service.revoke('key-1', session)).rejects.toThrow('Active organization required')
    })
  })

  // -----------------------------------------------------------------------
  // revokeAllForUser()
  // -----------------------------------------------------------------------
  describe('revokeAllForUser()', () => {
    it('should update all non-revoked keys for the given userId', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.revokeAllForUser as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const service = createService(mockRepo)

      // Act
      await service.revokeAllForUser('user-1')

      // Assert
      expect(mockRepo.revokeAllForUser).toHaveBeenCalledOnce()
      // biome-ignore lint/style/noNonNullAssertion: verified toHaveBeenCalledOnce above
      const args = (mockRepo.revokeAllForUser as ReturnType<typeof vi.fn>).mock.calls[0]!
      expect(args[0]).toBe('user-1')
      expect(args[1]).toBeInstanceOf(Date)
    })

    it('should not throw when no keys exist for the user', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.revokeAllForUser as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const service = createService(mockRepo)

      // Act & Assert
      await expect(service.revokeAllForUser('user-no-keys')).resolves.toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // revokeAllForOrg()
  // -----------------------------------------------------------------------
  describe('revokeAllForOrg()', () => {
    it('should update all non-revoked keys for the given organizationId', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.revokeAllForOrg as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const service = createService(mockRepo)

      // Act
      await service.revokeAllForOrg('org-1')

      // Assert
      expect(mockRepo.revokeAllForOrg).toHaveBeenCalledOnce()
      // biome-ignore lint/style/noNonNullAssertion: verified toHaveBeenCalledOnce above
      const args = (mockRepo.revokeAllForOrg as ReturnType<typeof vi.fn>).mock.calls[0]!
      expect(args[0]).toBe('org-1')
      expect(args[1]).toBeInstanceOf(Date)
    })

    it('should not throw when no keys exist for the organization', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.revokeAllForOrg as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const service = createService(mockRepo)

      // Act & Assert
      await expect(service.revokeAllForOrg('org-no-keys')).resolves.toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // validateBearerToken() — token validation tests
  // -----------------------------------------------------------------------
  describe('validateBearerToken()', () => {
    it('should return row data (id, userId, tenantId, scopes, role) when token is valid', async () => {
      // Arrange
      const { token, salt, hash } = buildValidToken()
      const keyId = 'key-uuid-valid'
      const userId = 'user-uuid-1'
      const tenantId = 'tenant-uuid-1'
      const scopes = ['api:read', 'api:write']
      const role = 'user'

      const candidate = {
        id: keyId,
        userId,
        tenantId,
        scopes,
        keyHash: hash,
        keySalt: salt,
        revokedAt: null,
        expiresAt: null,
        role,
      }

      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.findCandidatesByLastFour as ReturnType<typeof vi.fn>).mockResolvedValue([
        candidate,
      ])
      ;(mockRepo.touchLastUsedAt as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const service = createService(mockRepo)

      // Act
      const result = await service.validateBearerToken(token)

      // Assert
      expect(result).toMatchObject({ id: keyId, userId, tenantId, scopes, role })
    })

    it('should throw ApiKeyInvalidException when no candidates match lastFour', async () => {
      // Arrange
      const { token } = buildValidToken()
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.findCandidatesByLastFour as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const service = createService(mockRepo)

      // Act & Assert
      await expect(service.validateBearerToken(token)).rejects.toThrow(ApiKeyInvalidException)
      await expect(service.validateBearerToken(token)).rejects.toMatchObject({
        errorCode: ErrorCode.API_KEY_INVALID,
      })
    })

    it('should throw ApiKeyInvalidException when HMAC does not match any candidate', async () => {
      // Arrange
      const { token } = buildValidToken()
      const wrongSalt = randomBytes(16).toString('hex')
      const wrongHash = hmacHashHelper('sk_live_completely_different_token', wrongSalt)

      const candidate = {
        id: 'key-wrong',
        userId: 'user-2',
        tenantId: 'tenant-2',
        scopes: [],
        keyHash: wrongHash, // hash of a DIFFERENT token — HMAC mismatch
        keySalt: wrongSalt,
        revokedAt: null,
        expiresAt: null,
        role: 'user',
      }

      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.findCandidatesByLastFour as ReturnType<typeof vi.fn>).mockResolvedValue([
        candidate,
      ])
      const service = createService(mockRepo)

      // Act & Assert
      await expect(service.validateBearerToken(token)).rejects.toThrow(ApiKeyInvalidException)
      await expect(service.validateBearerToken(token)).rejects.toMatchObject({
        errorCode: ErrorCode.API_KEY_INVALID,
      })
    })

    it('should throw ApiKeyInvalidException when key revokedAt is set', async () => {
      // Arrange — revoked keys are collapsed to ApiKeyInvalidException (uniform external exception)
      const { token, salt, hash } = buildValidToken()
      const candidate = {
        id: 'key-revoked',
        userId: 'user-3',
        tenantId: 'tenant-3',
        scopes: [],
        keyHash: hash,
        keySalt: salt,
        revokedAt: new Date('2026-01-01T00:00:00.000Z'), // revoked
        expiresAt: null,
        role: 'user',
      }

      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.findCandidatesByLastFour as ReturnType<typeof vi.fn>).mockResolvedValue([
        candidate,
      ])
      const service = createService(mockRepo)

      // Act & Assert
      await expect(service.validateBearerToken(token)).rejects.toThrow(ApiKeyInvalidException)
      await expect(service.validateBearerToken(token)).rejects.toMatchObject({
        errorCode: ErrorCode.API_KEY_INVALID,
      })
    })

    it('should throw ApiKeyInvalidException when expiresAt is in the past', async () => {
      // Arrange — expired keys are collapsed to ApiKeyInvalidException (uniform external exception)
      const { token, salt, hash } = buildValidToken()
      const candidate = {
        id: 'key-expired',
        userId: 'user-4',
        tenantId: 'tenant-4',
        scopes: [],
        keyHash: hash,
        keySalt: salt,
        revokedAt: null,
        expiresAt: new Date('2020-01-01T00:00:00.000Z'), // expired
        role: 'user',
      }

      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.findCandidatesByLastFour as ReturnType<typeof vi.fn>).mockResolvedValue([
        candidate,
      ])
      const service = createService(mockRepo)

      // Act & Assert
      await expect(service.validateBearerToken(token)).rejects.toThrow(ApiKeyInvalidException)
      await expect(service.validateBearerToken(token)).rejects.toMatchObject({
        errorCode: ErrorCode.API_KEY_INVALID,
      })
    })

    it('should throw ApiKeyInvalidException for tokens that do not match the sk_live_ format', async () => {
      // Arrange
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.findCandidatesByLastFour as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const service = createService(mockRepo)

      // Act & Assert — wrong prefix
      await expect(service.validateBearerToken('invalid_token_abc')).rejects.toThrow(
        ApiKeyInvalidException
      )
      // Too short
      await expect(service.validateBearerToken('sk_live_short')).rejects.toThrow(
        ApiKeyInvalidException
      )
      // Correct format
      const validToken = `sk_live_${'a'.repeat(32)}`
      // DB returns empty — still invalid but gets past format check
      await expect(service.validateBearerToken(validToken)).rejects.toThrow(ApiKeyInvalidException)
    })

    it('should return the correct candidate when multiple rows share the same lastFour (collision)', async () => {
      // Arrange — two tokens with identical lastFour but different salts/hashes
      const { token, lastFour, salt, hash } = buildValidToken()

      // Candidate A: same lastFour, but salt/hash belong to a DIFFERENT token — HMAC mismatch
      const differentToken = `sk_live_${'b'.repeat(32)}`
      const saltA = randomBytes(16).toString('hex')
      const hashA = hmacHashHelper(differentToken, saltA)
      const candidateA = {
        id: 'key-collision-wrong',
        userId: 'user-collision-a',
        tenantId: 'tenant-collision-a',
        scopes: ['api:read'],
        keyHash: hashA,
        keySalt: saltA,
        revokedAt: null,
        expiresAt: null,
        role: 'user',
      }

      // Candidate B: same lastFour, correct salt/hash for the actual token — HMAC match
      const candidateB = {
        id: 'key-collision-correct',
        userId: 'user-collision-b',
        tenantId: 'tenant-collision-b',
        scopes: ['api:read', 'api:write'],
        keyHash: hash,
        keySalt: salt,
        revokedAt: null,
        expiresAt: null,
        role: 'admin',
      }

      // Verify both candidates have the same lastFour (collision precondition)
      expect(candidateA.id).not.toBe(candidateB.id)
      expect(lastFour).toHaveLength(4)

      const mockRepo = createMockApiKeyRepo()
      // DB returns both candidates — only candidateB should match the HMAC
      ;(mockRepo.findCandidatesByLastFour as ReturnType<typeof vi.fn>).mockResolvedValue([
        candidateA,
        candidateB,
      ])
      const service = createService(mockRepo)

      // Act
      const result = await service.validateBearerToken(token)

      // Assert — must resolve to candidateB, not candidateA
      expect(result).toMatchObject({
        id: 'key-collision-correct',
        userId: 'user-collision-b',
        tenantId: 'tenant-collision-b',
        scopes: ['api:read', 'api:write'],
        role: 'admin',
      })
    })
  })

  // -----------------------------------------------------------------------
  // touchLastUsedAt() — fire-and-forget tests
  // -----------------------------------------------------------------------
  describe('touchLastUsedAt()', () => {
    it('should call repo.touchLastUsedAt with the correct key id and tenantId and not throw', () => {
      // Arrange
      const keyId = 'key-uuid-touch'
      const tenantId = 'tenant-uuid-touch'
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.touchLastUsedAt as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const service = createService(mockRepo)

      // Act — fire-and-forget, returns void synchronously
      expect(() => service.touchLastUsedAt(keyId, tenantId)).not.toThrow()

      // Assert
      expect(mockRepo.touchLastUsedAt).toHaveBeenCalledWith(keyId, tenantId, expect.any(Date))
    })

    it('should return undefined synchronously (fire-and-forget — callers must not await)', () => {
      // Arrange
      const keyId = 'key-uuid-ff'
      const tenantId = 'tenant-uuid-ff'
      const mockRepo = createMockApiKeyRepo()
      ;(mockRepo.touchLastUsedAt as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const service = createService(mockRepo)

      // Act
      const returnValue = service.touchLastUsedAt(keyId, tenantId)

      // Assert
      expect(returnValue).toBeUndefined()
    })
  })
})
