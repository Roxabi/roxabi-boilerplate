import type { FeatureFlag } from '@repo/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteFeatureFlag, toggleFeatureFlag } from './api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJsonResponse(body: unknown, ok: boolean, status = 200): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

function makeJsonErrorResponse(body: unknown, status = 400): Response {
  return makeJsonResponse(body, false, status)
}

function makeBrokenJsonResponse(status = 500): Response {
  return {
    ok: false,
    status,
    json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
  } as unknown as Response
}

// ---------------------------------------------------------------------------
// toggleFeatureFlag
// ---------------------------------------------------------------------------

describe('toggleFeatureFlag', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends PATCH to the correct URL with credentials and JSON body', async () => {
    const flag: FeatureFlag = {
      id: 'ff-1',
      key: 'my-flag',
      name: 'My Flag',
      enabled: true,
      description: null,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeJsonResponse(flag, true))

    await toggleFeatureFlag('ff-1', true)

    const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ]
    expect(url).toBe('/api/admin/feature-flags/ff-1')
    expect(options.method).toBe('PATCH')
    expect(options.credentials).toBe('include')
    expect(options.body).toBe(JSON.stringify({ enabled: true }))
    expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('returns the FeatureFlag from a successful response', async () => {
    const flag: FeatureFlag = {
      id: 'ff-2',
      key: 'beta',
      name: 'Beta',
      enabled: false,
      description: 'Beta feature',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeJsonResponse(flag, true))

    const result = await toggleFeatureFlag('ff-2', false)

    expect(result).toEqual(flag)
  })

  it('throws Error with body.message on non-ok response with message field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeJsonErrorResponse({ message: 'Feature flag not found' }, 404)
    )

    await expect(toggleFeatureFlag('ff-99', true)).rejects.toThrow('Feature flag not found')
  })

  it('throws fallback error when non-ok body has no message field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeJsonErrorResponse({ code: 'SERVER_ERROR' }, 500)
    )

    await expect(toggleFeatureFlag('ff-1', true)).rejects.toThrow('Failed to update feature flag')
  })

  it('throws fallback error when res.json() fails on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeBrokenJsonResponse(503))

    await expect(toggleFeatureFlag('ff-1', false)).rejects.toThrow('Failed to update feature flag')
  })

  it('throws fallback error when non-ok body is null', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeJsonErrorResponse(null, 500))

    await expect(toggleFeatureFlag('ff-1', true)).rejects.toThrow('Failed to update feature flag')
  })
})

// ---------------------------------------------------------------------------
// deleteFeatureFlag
// ---------------------------------------------------------------------------

describe('deleteFeatureFlag', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends DELETE to the correct URL with credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeJsonResponse(null, true, 204))

    await deleteFeatureFlag('ff-1')

    const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ]
    expect(url).toBe('/api/admin/feature-flags/ff-1')
    expect(options.method).toBe('DELETE')
    expect(options.credentials).toBe('include')
  })

  it('resolves with void on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeJsonResponse(null, true, 204))

    const result = await deleteFeatureFlag('ff-1')

    expect(result).toBeUndefined()
  })

  it('throws Error with body.message on non-ok response with message field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeJsonErrorResponse({ message: 'Cannot delete active flag' }, 409)
    )

    await expect(deleteFeatureFlag('ff-1')).rejects.toThrow('Cannot delete active flag')
  })

  it('throws fallback error when non-ok body has no message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeJsonErrorResponse({ error: 'forbidden' }, 403)
    )

    await expect(deleteFeatureFlag('ff-1')).rejects.toThrow('Failed to delete feature flag')
  })

  it('throws fallback error when res.json() fails on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeBrokenJsonResponse(500))

    await expect(deleteFeatureFlag('ff-1')).rejects.toThrow('Failed to delete feature flag')
  })

  it('throws fallback error when non-ok body is null', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeJsonErrorResponse(null, 500))

    await expect(deleteFeatureFlag('ff-1')).rejects.toThrow('Failed to delete feature flag')
  })
})
