import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { AuthenticatedSession } from '../auth/types.js'
import { ZodValidationPipe } from '../common/pipes/zodValidation.pipe.js'
import { ApiKeyController } from './apiKey.controller.js'

// ---------------------------------------------------------------------------
// Schema mirror (same rules as the controller's private createApiKeySchema)
// ---------------------------------------------------------------------------

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string().regex(/^[a-z_]+:[a-z_]+$/, 'Scopes must use resource:action format')),
  expiresAt: z.string().datetime().nullish(),
})

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createMockApiKeyService() {
  return {
    create: vi.fn(),
    list: vi.fn(),
    revoke: vi.fn(),
  }
}

function createSession(overrides: Partial<AuthenticatedSession> = {}): AuthenticatedSession {
  return {
    user: { id: 'user-1' },
    session: { id: 'sess-1', activeOrganizationId: 'org-1' },
    permissions: ['api_keys:read', 'api_keys:write'],
    actorType: 'user',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ApiKeyController', () => {
  describe('create()', () => {
    it('should delegate to apiKeyService.create with session and body', async () => {
      // Arrange
      const service = createMockApiKeyService()
      const expected = { id: 'key-1', key: 'sk_live_abc123', name: 'My Key' }
      service.create.mockResolvedValue(expected)
      const controller = new ApiKeyController(service as never)
      const session = createSession()
      const body = { name: 'My Key', scopes: ['api_keys:read'] }

      // Act
      const result = await controller.create(session, body)

      // Assert
      expect(service.create).toHaveBeenCalledWith(session, body)
      expect(result).toEqual(expected)
    })

    it('should propagate service errors', async () => {
      // Arrange
      const service = createMockApiKeyService()
      service.create.mockRejectedValue(new Error('Scopes exceeded'))
      const controller = new ApiKeyController(service as never)

      // Act & Assert
      await expect(
        controller.create(createSession(), { name: 'X', scopes: ['invalid'] })
      ).rejects.toThrow('Scopes exceeded')
    })
  })

  describe('list()', () => {
    it('should delegate to apiKeyService.list with the full session', async () => {
      // Arrange
      const service = createMockApiKeyService()
      const expected = { data: [{ id: 'key-1', name: 'Key One' }] }
      service.list.mockResolvedValue(expected)
      const controller = new ApiKeyController(service as never)
      const session = createSession()

      // Act
      const result = await controller.list(session)

      // Assert
      expect(service.list).toHaveBeenCalledWith(session)
      expect(result).toEqual(expected)
    })
  })

  describe('revoke()', () => {
    it('should delegate to apiKeyService.revoke with id and full session', async () => {
      // Arrange
      const service = createMockApiKeyService()
      const expected = { id: 'key-1', revokedAt: '2024-06-01T00:00:00.000Z' }
      service.revoke.mockResolvedValue(expected)
      const controller = new ApiKeyController(service as never)
      const session = createSession()

      // Act
      const result = await controller.revoke('key-1', session)

      // Assert
      expect(service.revoke).toHaveBeenCalledWith('key-1', session)
      expect(result).toEqual(expected)
    })

    it('should propagate service errors for non-existent keys', async () => {
      // Arrange
      const service = createMockApiKeyService()
      service.revoke.mockRejectedValue(new Error('Not found'))
      const controller = new ApiKeyController(service as never)

      // Act & Assert
      await expect(controller.revoke('nonexistent', createSession())).rejects.toThrow('Not found')
    })
  })
})

// ---------------------------------------------------------------------------
// createApiKeySchema validation (via ZodValidationPipe)
// ---------------------------------------------------------------------------

describe('createApiKeySchema validation', () => {
  const pipe = new ZodValidationPipe(createApiKeySchema)

  it('should reject an empty name', () => {
    // Arrange
    const body = { name: '', scopes: [] }

    // Act & Assert
    expect(() => pipe.transform(body)).toThrow(BadRequestException)
  })

  it('should reject a name longer than 100 characters', () => {
    // Arrange
    const body = { name: 'a'.repeat(101), scopes: [] }

    // Act & Assert
    expect(() => pipe.transform(body)).toThrow(BadRequestException)
  })

  it('should reject an invalid datetime format for expiresAt', () => {
    // Arrange
    const body = { name: 'Valid Name', scopes: [], expiresAt: 'not-a-datetime' }

    // Act & Assert
    expect(() => pipe.transform(body)).toThrow(BadRequestException)
  })

  it('should accept a valid minimal request with name and empty scopes', () => {
    // Arrange
    const body = { name: 'My Key', scopes: [] }

    // Act
    const result = pipe.transform(body)

    // Assert
    expect(result).toEqual({ name: 'My Key', scopes: [] })
  })

  it('should accept a valid request with expiresAt as null', () => {
    // Arrange
    const body = { name: 'My Key', scopes: ['api_keys:read'], expiresAt: null }

    // Act
    const result = pipe.transform(body)

    // Assert
    expect(result).toEqual({ name: 'My Key', scopes: ['api_keys:read'], expiresAt: null })
  })

  it('should accept a valid request with a proper datetime for expiresAt', () => {
    // Arrange
    const body = {
      name: 'My Key',
      scopes: ['api_keys:read'],
      expiresAt: '2099-01-01T00:00:00.000Z',
    }

    // Act
    const result = pipe.transform(body)

    // Assert
    expect(result).toEqual(body)
  })
})
