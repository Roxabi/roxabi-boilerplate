import type {
  ApiKey,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ListApiKeysResponse,
  RevokeApiKeyResponse,
} from '@repo/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApiKey, listApiKeys, revokeApiKey } from './apiKeys'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

function createErrorResponse(status: number, body?: Record<string, unknown>): Response {
  if (body) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }
  return new Response('Internal Server Error', { status })
}

function makeApiKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: 'key-1',
    name: 'Test Key',
    keyPrefix: 'rxb_',
    lastFour: 'abcd',
    scopes: ['read:data'],
    rateLimitTier: 'standard',
    expiresAt: null,
    lastUsedAt: null,
    revokedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let fetchSpy: ReturnType<typeof vi.spyOn>

afterEach(() => {
  fetchSpy?.mockRestore()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('api-keys', () => {
  // -------------------------------------------------------------------------
  // listApiKeys
  // -------------------------------------------------------------------------
  describe('listApiKeys', () => {
    it('should return the list of API keys on success', async () => {
      // Arrange
      const responseBody: ListApiKeysResponse = {
        data: [makeApiKey(), makeApiKey({ id: 'key-2', name: 'Second Key' })],
      }
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse(responseBody))

      // Act
      const result = await listApiKeys()

      // Assert
      expect(result).toEqual(responseBody)
      expect(result.data).toHaveLength(2)
    })

    it('should call GET /api/api-keys with credentials included', async () => {
      // Arrange
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse({ data: [] }))

      // Act
      await listApiKeys()

      // Assert
      expect(fetchSpy).toHaveBeenCalledOnce()
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('/api/api-keys')
      expect(options.credentials).toBe('include')
      expect(options.method).toBeUndefined() // GET is the default
    })

    it('should forward the abort signal', async () => {
      // Arrange
      const controller = new AbortController()
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse({ data: [] }))

      // Act
      await listApiKeys(controller.signal)

      // Assert
      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
      expect(options.signal).toBe(controller.signal)
    })

    it('should throw when the response is not ok', async () => {
      // Arrange
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createErrorResponse(403))

      // Act & Assert
      await expect(listApiKeys()).rejects.toThrow('Failed to list API keys: 403')
    })
  })

  // -------------------------------------------------------------------------
  // createApiKey
  // -------------------------------------------------------------------------
  describe('createApiKey', () => {
    const requestBody: CreateApiKeyRequest = {
      name: 'My Key',
      scopes: ['read:data', 'write:data'],
      expiresAt: '2027-01-01T00:00:00.000Z',
    }

    const successResponse: CreateApiKeyResponse = {
      id: 'key-new',
      name: 'My Key',
      key: 'rxb_full_secret_key_value',
      keyPrefix: 'rxb_',
      lastFour: 'alue',
      scopes: ['read:data', 'write:data'],
      expiresAt: '2027-01-01T00:00:00.000Z',
      createdAt: '2026-02-24T00:00:00.000Z',
    }

    it('should return the created API key on success', async () => {
      // Arrange
      fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(createMockResponse(successResponse))

      // Act
      const result = await createApiKey(requestBody)

      // Assert
      expect(result).toEqual(successResponse)
    })

    it('should call POST /api/api-keys with JSON body and credentials', async () => {
      // Arrange
      fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(createMockResponse(successResponse))

      // Act
      await createApiKey(requestBody)

      // Assert
      expect(fetchSpy).toHaveBeenCalledOnce()
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('/api/api-keys')
      expect(options.method).toBe('POST')
      expect(options.credentials).toBe('include')
      expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(options.body).toBe(JSON.stringify(requestBody))
    })

    it('should throw with server error message when response is not ok and body is parseable', async () => {
      // Arrange
      fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(createErrorResponse(422, { message: 'Name already taken' }))

      // Act & Assert
      await expect(createApiKey(requestBody)).rejects.toThrow('Name already taken')
    })

    it('should throw with fallback message when response is not ok and body is not parseable', async () => {
      // Arrange
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createErrorResponse(500))

      // Act & Assert
      await expect(createApiKey(requestBody)).rejects.toThrow('Failed to create API key: 500')
    })

    it('should throw with fallback message when error body has no message field', async () => {
      // Arrange
      fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(createErrorResponse(400, { error: 'something went wrong' }))

      // Act & Assert
      await expect(createApiKey(requestBody)).rejects.toThrow('Failed to create API key: 400')
    })
  })

  // -------------------------------------------------------------------------
  // revokeApiKey
  // -------------------------------------------------------------------------
  describe('revokeApiKey', () => {
    const revokeResponse: RevokeApiKeyResponse = {
      id: 'key-1',
      revokedAt: '2026-02-24T12:00:00.000Z',
    }

    it('should return the revoked key data on success', async () => {
      // Arrange
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse(revokeResponse))

      // Act
      const result = await revokeApiKey('key-1')

      // Assert
      expect(result).toEqual(revokeResponse)
    })

    it('should call DELETE /api/api-keys/:id with credentials', async () => {
      // Arrange
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse(revokeResponse))

      // Act
      await revokeApiKey('key-1')

      // Assert
      expect(fetchSpy).toHaveBeenCalledOnce()
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('/api/api-keys/key-1')
      expect(options.method).toBe('DELETE')
      expect(options.credentials).toBe('include')
    })

    it('should interpolate the key id into the URL', async () => {
      // Arrange
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse(revokeResponse))

      // Act
      await revokeApiKey('some-other-id')

      // Assert
      const [url] = fetchSpy.mock.calls[0] as [string]
      expect(url).toBe('/api/api-keys/some-other-id')
    })

    it('should throw with server error message when response is not ok and body is parseable', async () => {
      // Arrange
      fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(createErrorResponse(404, { message: 'API key not found' }))

      // Act & Assert
      await expect(revokeApiKey('nonexistent')).rejects.toThrow('API key not found')
    })

    it('should throw with fallback message when response is not ok and body is not parseable', async () => {
      // Arrange
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createErrorResponse(500))

      // Act & Assert
      await expect(revokeApiKey('key-1')).rejects.toThrow('Failed to revoke API key: 500')
    })

    it('should throw with fallback message when error body has no message field', async () => {
      // Arrange
      fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(createErrorResponse(409, { detail: 'conflict detected' }))

      // Act & Assert
      await expect(revokeApiKey('key-1')).rejects.toThrow('Failed to revoke API key: 409')
    })
  })
})
