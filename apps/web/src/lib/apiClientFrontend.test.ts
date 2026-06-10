/**
 * Tests for the frontend API client (apiClient.ts).
 * Covers ApiError, apiGet, apiPost, apiPatch, apiDelete, and error branches.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from './apiClient'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOkResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeErrorResponse(body: unknown, status: number, asText?: string): Response {
  const text = asText ?? JSON.stringify(body)
  return new Response(text, {
    status,
    headers: { 'Content-Type': 'application/json' },
    // Response.ok is false when status >= 400
  })
}

// ---------------------------------------------------------------------------
// ApiError class
// ---------------------------------------------------------------------------

describe('ApiError', () => {
  it('is an instance of Error', () => {
    const err = new ApiError(400, 'Bad Request')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
  })

  it('sets name to ApiError', () => {
    const err = new ApiError(422, 'Unprocessable')
    expect(err.name).toBe('ApiError')
  })

  it('exposes status and message', () => {
    const err = new ApiError(404, 'Not Found')
    expect(err.status).toBe(404)
    expect(err.message).toBe('Not Found')
  })

  it('exposes body defaulting to null', () => {
    const err = new ApiError(500, 'Server Error')
    expect(err.body).toBeNull()
  })

  it('stores body when provided', () => {
    const body = { code: 'CONFLICT', detail: 'already exists' }
    const err = new ApiError(409, 'Conflict', body)
    expect(err.body).toEqual(body)
  })
})

// ---------------------------------------------------------------------------
// apiGet
// ---------------------------------------------------------------------------

describe('apiGet', () => {
  beforeEach(() => {
    // Provide window.location.origin for URL construction
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('fetches the URL and returns parsed JSON on success', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(makeOkResponse({ id: 1, name: 'Alice' }))

    const result = await apiGet<{ id: number; name: string }>('/api/users')

    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(result).toEqual({ id: 1, name: 'Alice' })
  })

  it('appends query params to the URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse([]))

    await apiGet('/api/items', { page: '2', size: '10' })

    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('page=2')
    expect(calledUrl).toContain('size=10')
  })

  it('skips falsy query param values', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse([]))

    await apiGet('/api/items', { search: '', page: '1' })

    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string
    expect(calledUrl).not.toContain('search=')
    expect(calledUrl).toContain('page=1')
  })

  it('throws ApiError with message from body on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeErrorResponse({ message: 'Not found here' }, 404)
    )

    await expect(apiGet('/api/missing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Not found here',
    })
  })

  it('falls back to HTTP status message when error body has no message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeErrorResponse({ code: 'UNKNOWN' }, 503))

    await expect(apiGet('/api/down')).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      message: 'HTTP 503',
    })
  })

  it('throws ApiError with "Malformed JSON response" when error body is invalid JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeErrorResponse(null, 500, 'not json at all'))

    await expect(apiGet('/api/broken')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Malformed JSON response',
      status: 500,
    })
  })

  it('throws ApiError with "Malformed JSON response" when success body is invalid JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not valid json', { status: 200 }))

    await expect(apiGet('/api/malformed')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Malformed JSON response',
    })
  })

  it('passes signal to fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse({}))

    const controller = new AbortController()
    await apiGet('/api/users', undefined, controller.signal)

    const options = fetchSpy.mock.calls[0]?.[1] as RequestInit
    expect(options.signal).toBe(controller.signal)
  })

  it('includes credentials: include', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse({}))

    await apiGet('/api/users')

    const options = fetchSpy.mock.calls[0]?.[1] as RequestInit
    expect(options.credentials).toBe('include')
  })
})

// ---------------------------------------------------------------------------
// apiPost
// ---------------------------------------------------------------------------

describe('apiPost', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sends a POST with JSON body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse({ ok: true }))

    const payload = { name: 'Bob' }
    await apiPost('/api/users', payload)

    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/users')
    expect(options.method).toBe('POST')
    expect(options.body).toBe(JSON.stringify(payload))
    expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('throws ApiError on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeErrorResponse({ message: 'Conflict' }, 409))

    await expect(apiPost('/api/users', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
    })
  })
})

// ---------------------------------------------------------------------------
// apiPatch
// ---------------------------------------------------------------------------

describe('apiPatch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sends a PATCH with JSON body', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(makeOkResponse({ updated: true }))

    const payload = { name: 'Updated' }
    await apiPatch('/api/items/1', payload)

    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/items/1')
    expect(options.method).toBe('PATCH')
    expect(options.body).toBe(JSON.stringify(payload))
  })

  it('throws ApiError on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeErrorResponse({ message: 'Not Found' }, 404)
    )

    await expect(apiPatch('/api/items/99', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Not Found',
    })
  })
})

// ---------------------------------------------------------------------------
// apiDelete
// ---------------------------------------------------------------------------

describe('apiDelete', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sends a DELETE request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(null))

    await apiDelete('/api/items/1')

    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/items/1')
    expect(options.method).toBe('DELETE')
  })

  it('throws ApiError on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeErrorResponse({ message: 'Forbidden' }, 403)
    )

    await expect(apiDelete('/api/items/1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Forbidden',
    })
  })

  it('passes signal to fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(null))

    const controller = new AbortController()
    await apiDelete('/api/items/1', undefined, controller.signal)

    const options = fetchSpy.mock.calls[0]?.[1] as RequestInit
    expect(options.signal).toBe(controller.signal)
  })

  it('resolves without throwing on 204 No Content', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    await expect(apiDelete('/api/items/1')).resolves.toBeUndefined()
  })

  it('sends a JSON body when provided', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))

    await apiDelete('/api/items/1', { confirmName: 'Acme' })

    const options = fetchSpy.mock.calls[0]?.[1] as RequestInit
    expect(options.method).toBe('DELETE')
    expect(options.body).toBe(JSON.stringify({ confirmName: 'Acme' }))
  })
})
