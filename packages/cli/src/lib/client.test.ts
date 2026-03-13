import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from './client.js'

vi.mock('./credentials.js', () => ({
  loadCredentials: vi.fn(() => ({
    token: 'sk_live_test123',
    apiUrl: 'http://localhost:4000',
  })),
}))

describe('createClient', () => {
  it('creates a client with stored credentials', () => {
    const client = createClient()
    expect(client).toBeDefined()
    expect(client.get).toBeTypeOf('function')
    expect(client.delete).toBeTypeOf('function')
    expect(client.patch).toBeTypeOf('function')
    expect(client.post).toBeTypeOf('function')
  })

  it('uses explicit apiUrl and token over stored credentials', () => {
    const client = createClient('http://other:5000', 'sk_live_override')
    expect(client).toBeDefined()
  })

  it('throws when no credentials available', async () => {
    const { loadCredentials } = await import('./credentials.js')
    vi.mocked(loadCredentials).mockReturnValueOnce(null)
    expect(() => createClient()).toThrow('Not authenticated')
  })
})

describe('createClient requests', () => {
  const fetchSpy = vi.fn()

  beforeEach(() => {
    fetchSpy.mockReset()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GET request sends Authorization header and Content-Type', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '1', name: 'Test' }),
    })

    const client = createClient()
    const result = await client.get<{ id: string; name: string }>('/api/v1/users/me')

    expect(result).toEqual({ id: '1', name: 'Test' })
    expect(fetchSpy).toHaveBeenCalledOnce()

    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toContain('/api/v1/users/me')
    expect(options.headers.Authorization).toBe('Bearer sk_live_test123')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.method).toBe('GET')
  })

  it('GET with params appends query string', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    })

    const client = createClient()
    await client.get('/api/v1/members', { page: '1', limit: '10' })

    const [url] = fetchSpy.mock.calls[0]
    expect(url).toContain('page=1')
    expect(url).toContain('limit=10')
  })

  it('DELETE returns undefined for 204', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 204 })

    const client = createClient()
    const result = await client.delete('/api/v1/members/123')
    expect(result).toBeUndefined()
  })

  it('POST sends JSON body', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: 'new' }),
    })

    const client = createClient()
    await client.post('/api/v1/invitations', { email: 'test@example.com' })

    const [, options] = fetchSpy.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ email: 'test@example.com' })
  })

  it('PATCH sends JSON body', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ updated: true }),
    })

    const client = createClient()
    await client.patch('/api/v1/members/123/role', { roleId: 'abc' })

    const [, options] = fetchSpy.mock.calls[0]
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body)).toEqual({ roleId: 'abc' })
  })

  it('throws ApiError on non-ok response with error body', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }),
    })

    const client = createClient()
    await expect(client.get('/api/v1/users/me')).rejects.toMatchObject({
      statusCode: 401,
      errorCode: 'UNAUTHORIZED',
      message: 'Invalid token',
    })
  })

  it('throws ApiError with fallback for partial error body', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ error: {} }),
    })

    const client = createClient()
    await expect(client.get('/api/v1/users/me')).rejects.toMatchObject({
      statusCode: 422,
      errorCode: 'UNKNOWN_ERROR',
      message: 'HTTP 422',
    })
  })

  it('throws ApiError with fallback when error body is unparseable', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    })

    const client = createClient()
    await expect(client.get('/api/v1/users/me')).rejects.toMatchObject({
      statusCode: 500,
      errorCode: 'UNKNOWN_ERROR',
      message: 'HTTP 500',
    })
  })
})
