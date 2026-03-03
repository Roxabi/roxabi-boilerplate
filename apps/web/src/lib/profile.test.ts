import type { UserProfile } from '@repo/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getProfile, isApiError, updateProfile } from './profile'

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

const mockProfile: UserProfile = {
  id: 'user-1',
  firstName: 'Jane',
  lastName: 'Doe',
  fullName: 'Jane Doe',
  fullNameCustomized: false,
  email: 'jane@example.com',
  emailVerified: true,
  image: null,
  avatarSeed: 'user-1',
  avatarStyle: 'lorelei',
  avatarOptions: {},
  role: 'member',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
  deleteScheduledFor: null,
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let fetchSpy: ReturnType<typeof vi.spyOn> | undefined

afterEach(() => {
  fetchSpy?.mockRestore()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getProfile', () => {
  it('should call GET /api/users/me with credentials: include', async () => {
    // Arrange
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse(mockProfile))

    // Act
    await getProfile()

    // Assert
    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/users/me')
    expect(options.credentials).toBe('include')
    expect(options.method).toBeUndefined() // GET is default
  })

  it('should return the raw UserProfile on success', async () => {
    // Arrange
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse(mockProfile))

    // Act
    const result = await getProfile()

    // Assert — getProfile returns JSON-parsed data; dates become ISO strings
    expect(result).toEqual(JSON.parse(JSON.stringify(mockProfile)))
  })

  it('should throw when response is not ok', async () => {
    // Arrange
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createErrorResponse(401))

    // Act & Assert
    await expect(getProfile()).rejects.toThrow('Failed to fetch profile:')
  })

  it('should propagate network errors from fetch', async () => {
    // Arrange
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    // Act & Assert
    await expect(getProfile()).rejects.toThrow('Network error')
  })

  it('should pass the signal to fetch when provided', async () => {
    // Arrange
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse(mockProfile))
    const controller = new AbortController()

    // Act
    await getProfile(controller.signal)

    // Assert
    expect(fetchSpy).toHaveBeenCalledOnce()
    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(options.signal).toBe(controller.signal)
  })
})

describe('updateProfile', () => {
  const payload = {
    firstName: 'Jane',
    lastName: 'Doe',
    fullName: 'Jane Doe',
    avatarStyle: 'lorelei' as const,
    avatarOptions: {},
  }

  it('should call PATCH /api/users/me with correct method, headers, credentials, and body', async () => {
    // Arrange
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse({}))

    // Act
    await updateProfile(payload)

    // Assert
    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/users/me')
    expect(options.method).toBe('PATCH')
    expect(options.credentials).toBe('include')
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(options.body).toBe(JSON.stringify(payload))
  })

  it('should resolve without error on success (2xx)', async () => {
    // Arrange
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse({}))

    // Act & Assert
    await expect(updateProfile(payload)).resolves.toBeUndefined()
  })

  it('should throw with message from response body on API error', async () => {
    // Arrange
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createErrorResponse(422, { message: 'Validation failed' }))

    // Act & Assert
    await expect(updateProfile(payload)).rejects.toThrow('Validation failed')
  })

  it('should throw with empty message when API error body has no message field', async () => {
    // Arrange
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createErrorResponse(400, { error: 'something went wrong' }))

    // Act & Assert
    await expect(updateProfile(payload)).rejects.toThrow('')
  })

  it('should throw with empty message when API error body is not JSON-parseable', async () => {
    // Arrange
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('Internal Server Error', { status: 500 }))

    // Act & Assert
    await expect(updateProfile(payload)).rejects.toThrow('')
  })

  describe('isApiError flag', () => {
    it('should tag thrown error with isApiError: true on API error', async () => {
      // Arrange
      fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(createErrorResponse(422, { message: 'Bad request' }))

      // Act
      let thrownError: unknown
      try {
        await updateProfile(payload)
      } catch (err) {
        thrownError = err
      }

      // Assert
      expect(isApiError(thrownError)).toBe(true)
    })

    it('should NOT have isApiError when fetch throws a network error', async () => {
      // Arrange
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

      // Act
      let thrownError: unknown
      try {
        await updateProfile(payload)
      } catch (err) {
        thrownError = err
      }

      // Assert
      expect(isApiError(thrownError)).toBe(false)
    })
  })
})

describe('isApiError', () => {
  it('should return true for an Error with isApiError: true', () => {
    const err = Object.assign(new Error('API error'), { isApiError: true as const })
    expect(isApiError(err)).toBe(true)
  })

  it('should return false for a plain Error without isApiError', () => {
    expect(isApiError(new Error('Network error'))).toBe(false)
  })

  it('should return false for non-Error values', () => {
    expect(isApiError('string error')).toBe(false)
    expect(isApiError(null)).toBe(false)
    expect(isApiError({ message: 'object error' })).toBe(false)
  })
})
