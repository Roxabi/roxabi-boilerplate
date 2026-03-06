import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

const mockUseRouter = vi.fn()
const mockUseQuery = vi.fn()
const mockGetRequestHeader = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  redirect: (opts: { to: string }) => new Error(`REDIRECT:${opts.to}`),
  useRouter: (...args: unknown[]) => mockUseRouter(...args),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    handler: (fn: (...args: unknown[]) => unknown) => fn,
  }),
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader: (...args: unknown[]) => mockGetRequestHeader(...args),
}))

vi.mock('@/lib/env.server', () => ({
  env: {
    get API_PORT() {
      return process.env.API_PORT ? parseInt(process.env.API_PORT, 10) : 4000
    },
  },
}))

// Import after mocks are set up
import { enforceRoutePermission, getServerEnrichedSession, useCanAccess } from './routePermissions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Helper: create an enriched session object. */
function createSession(
  overrides: Partial<{
    role: string
    permissions: string[]
  }> = {}
) {
  return {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      role: overrides.role ?? 'member',
    },
    session: {},
    permissions: overrides.permissions ?? [],
  }
}

/** Helper: build a beforeLoad context with session in context + optional permission. */
function createBeforeLoadCtx(
  permission?: string,
  session: ReturnType<typeof createSession> | null = null
) {
  const routeId = '/admin/test'
  return {
    routeId,
    matches: [
      {
        routeId,
        staticData: permission ? { permission } : {},
      },
    ],
    context: { session },
  }
}

/** Helper: configure mockUseRouter to return routesByPath with a given route entry. */
function setupRouter(
  routes: Record<string, { options?: { staticData?: { permission?: string } } } | undefined>
) {
  mockUseRouter.mockReturnValue({ routesByPath: routes })
}

/** Helper: configure mockUseQuery to return enriched session data. */
function setupUseQuery(data: ReturnType<typeof createSession> | null | undefined) {
  mockUseQuery.mockReturnValue({ data })
}

// ---------------------------------------------------------------------------
// getServerEnrichedSession
// ---------------------------------------------------------------------------

describe('getServerEnrichedSession', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockGetRequestHeader.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should return null when no cookie header is present', async () => {
    mockGetRequestHeader.mockReturnValue(undefined)
    const result = await getServerEnrichedSession()
    expect(result).toBeNull()
  })

  it('should return null when API responds with non-ok status', async () => {
    mockGetRequestHeader.mockReturnValue('session=abc')
    mockFetch.mockResolvedValue({ ok: false })
    const result = await getServerEnrichedSession()
    expect(result).toBeNull()
  })

  it('should return null when API returns invalid session data', async () => {
    mockGetRequestHeader.mockReturnValue('session=abc')
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ invalid: true }) })
    const result = await getServerEnrichedSession()
    expect(result).toBeNull()
  })

  it('should return null when API returns null body', async () => {
    mockGetRequestHeader.mockReturnValue('session=abc')
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(null) })
    const result = await getServerEnrichedSession()
    expect(result).toBeNull()
  })

  it('should return null when fetch throws a network error', async () => {
    mockGetRequestHeader.mockReturnValue('session=abc')
    mockFetch.mockRejectedValue(new Error('Network error'))
    const result = await getServerEnrichedSession()
    expect(result).toBeNull()
  })

  it('should return enriched session when API returns valid data', async () => {
    const session = {
      user: { id: '1', email: 'test@example.com', role: 'member' },
      session: {},
      permissions: ['members:read'],
    }
    mockGetRequestHeader.mockReturnValue('session=abc')
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(session) })
    const result = await getServerEnrichedSession()
    expect(result).toEqual(session)
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/api/session', {
      headers: { cookie: 'session=abc' },
    })
  })

  it('should use API_PORT when API_URL is not set', async () => {
    // Arrange
    vi.stubEnv('API_URL', undefined)
    vi.stubEnv('API_PORT', '5000')
    const session = {
      user: { id: '1', email: 'test@example.com', role: 'member' },
      session: {},
      permissions: ['members:read'],
    }
    mockGetRequestHeader.mockReturnValue('session=abc')
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(session) })

    // Act
    const result = await getServerEnrichedSession()

    // Assert
    expect(result).toEqual(session)
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:5000/api/session', {
      headers: { cookie: 'session=abc' },
    })
  })

  it('should prefer API_URL over API_PORT when both are set', async () => {
    // Arrange
    vi.stubEnv('API_URL', 'http://internal-api:8080')
    vi.stubEnv('API_PORT', '9999')
    const session = {
      user: { id: '1', email: 'test@example.com', role: 'member' },
      session: {},
      permissions: ['members:read'],
    }
    mockGetRequestHeader.mockReturnValue('session=abc')
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(session) })

    // Act
    const result = await getServerEnrichedSession()

    // Assert
    expect(result).toEqual(session)
    expect(mockFetch).toHaveBeenCalledWith('http://internal-api:8080/api/session', {
      headers: { cookie: 'session=abc' },
    })
  })

  it('should return null when session data has no user', async () => {
    mockGetRequestHeader.mockReturnValue('session=abc')
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ permissions: [] }),
    })
    const result = await getServerEnrichedSession()
    expect(result).toBeNull()
  })

  it('should return null when session data has no permissions array', async () => {
    mockGetRequestHeader.mockReturnValue('session=abc')
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ user: { id: '1', email: 'a@b.com' }, permissions: 'not-array' }),
    })
    const result = await getServerEnrichedSession()
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// enforceRoutePermission
// ---------------------------------------------------------------------------

describe('enforceRoutePermission', () => {
  it('should return early when no permission is defined in staticData', async () => {
    // Arrange
    const ctx = createBeforeLoadCtx()

    // Act
    const result = await enforceRoutePermission(ctx)

    // Assert
    expect(result).toBeUndefined()
  })

  it('should return early when matches array is empty', async () => {
    // Arrange — no matching route means no permission to enforce
    const ctx = { routeId: '/admin/test', matches: [], context: { session: null } }

    // Act
    const result = await enforceRoutePermission(ctx)

    // Assert
    expect(result).toBeUndefined()
  })

  it('should throw redirect to /login when session is null in context', async () => {
    // Arrange
    const ctx = createBeforeLoadCtx('role:superadmin', null)

    // Act & Assert
    await expect(enforceRoutePermission(ctx)).rejects.toThrow('REDIRECT:/login')
  })

  it('should allow superadmin for role:superadmin permission', async () => {
    // Arrange
    const ctx = createBeforeLoadCtx('role:superadmin', createSession({ role: 'superadmin' }))

    // Act & Assert
    await expect(enforceRoutePermission(ctx)).resolves.toBeUndefined()
  })

  it('should throw redirect to /admin when user does not have the required role', async () => {
    // Arrange
    const ctx = createBeforeLoadCtx('role:superadmin', createSession({ role: 'member' }))

    // Act & Assert
    await expect(enforceRoutePermission(ctx)).rejects.toThrow('REDIRECT:/admin')
  })

  it('should allow user with correct permission string (e.g. members:write)', async () => {
    // Arrange
    const ctx = createBeforeLoadCtx(
      'members:write',
      createSession({ role: 'member', permissions: ['members:write'] })
    )

    // Act & Assert
    await expect(enforceRoutePermission(ctx)).resolves.toBeUndefined()
  })

  it('should allow superadmin even for non-role permissions (bypass)', async () => {
    // Arrange
    const ctx = createBeforeLoadCtx(
      'members:write',
      createSession({ role: 'superadmin', permissions: [] })
    )

    // Act & Assert
    await expect(enforceRoutePermission(ctx)).resolves.toBeUndefined()
  })

  it('should throw redirect to /dashboard when user lacks org permission', async () => {
    // Arrange
    const ctx = createBeforeLoadCtx(
      'members:write',
      createSession({ role: 'member', permissions: ['members:read'] })
    )

    // Act & Assert
    await expect(enforceRoutePermission(ctx)).rejects.toThrow('REDIRECT:/dashboard')
  })
})

// ---------------------------------------------------------------------------
// useCanAccess
// ---------------------------------------------------------------------------

describe('useCanAccess', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockUseRouter.mockReset()
    mockUseQuery.mockReset()
  })

  it('should return true for a route with no permission requirement', () => {
    // Arrange
    setupRouter({
      '/admin/dashboard': { options: { staticData: {} } },
    })
    setupUseQuery(createSession())

    // Act
    const { result } = renderHook(() => useCanAccess('/admin/dashboard'))

    // Assert
    expect(result.current).toBe(true)
  })

  it('should return false when the route is not found in the router', () => {
    // Arrange
    setupRouter({})
    setupUseQuery(createSession())

    // Act
    const { result } = renderHook(() => useCanAccess('/nonexistent'))

    // Assert
    expect(result.current).toBe(false)
  })

  it('should return false when no session is available', () => {
    // Arrange
    setupRouter({
      '/admin/users': {
        options: { staticData: { permission: 'role:superadmin' } },
      },
    })
    setupUseQuery(null)

    // Act
    const { result } = renderHook(() => useCanAccess('/admin/users'))

    // Assert
    expect(result.current).toBe(false)
  })

  it('should return true for superadmin accessing role:superadmin route', () => {
    // Arrange
    setupRouter({
      '/admin/users': {
        options: { staticData: { permission: 'role:superadmin' } },
      },
    })
    setupUseQuery(createSession({ role: 'superadmin' }))

    // Act
    const { result } = renderHook(() => useCanAccess('/admin/users'))

    // Assert
    expect(result.current).toBe(true)
  })

  it('should return false for non-superadmin accessing role:superadmin route', () => {
    // Arrange
    setupRouter({
      '/admin/users': {
        options: { staticData: { permission: 'role:superadmin' } },
      },
    })
    setupUseQuery(createSession({ role: 'member' }))

    // Act
    const { result } = renderHook(() => useCanAccess('/admin/users'))

    // Assert
    expect(result.current).toBe(false)
  })

  it('should return true when user has the required permission', () => {
    // Arrange
    setupRouter({
      '/admin/members': {
        options: { staticData: { permission: 'members:write' } },
      },
    })
    setupUseQuery(createSession({ role: 'member', permissions: ['members:write'] }))

    // Act
    const { result } = renderHook(() => useCanAccess('/admin/members'))

    // Assert
    expect(result.current).toBe(true)
  })

  it('should return true for superadmin accessing any permission route (bypass)', () => {
    // Arrange
    setupRouter({
      '/admin/members': {
        options: { staticData: { permission: 'members:write' } },
      },
    })
    setupUseQuery(createSession({ role: 'superadmin', permissions: [] }))

    // Act
    const { result } = renderHook(() => useCanAccess('/admin/members'))

    // Assert
    expect(result.current).toBe(true)
  })

  it('should return false when user lacks the required permission', () => {
    // Arrange
    setupRouter({
      '/admin/members': {
        options: { staticData: { permission: 'members:write' } },
      },
    })
    setupUseQuery(createSession({ role: 'member', permissions: ['members:read'] }))

    // Act
    const { result } = renderHook(() => useCanAccess('/admin/members'))

    // Assert
    expect(result.current).toBe(false)
  })
})
