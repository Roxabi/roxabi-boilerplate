import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock apiClient before importing the hook
vi.mock('@/lib/apiClient', () => ({
  apiGet: vi.fn(),
}))

import { apiGet } from '@/lib/apiClient'
import { ORGANIZATIONS_QUERY_KEY, useOrganizations } from './useOrganizations'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return { Wrapper, queryClient }
}

const mockApiGet = apiGet as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ORGANIZATIONS_QUERY_KEY', () => {
  it('is the constant array ["organizations"]', () => {
    expect(ORGANIZATIONS_QUERY_KEY).toEqual(['organizations'])
  })
})

describe('useOrganizations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns isLoading=true initially when sessionKey is provided', () => {
    mockApiGet.mockReturnValue(new Promise(() => {})) // never resolves

    const { Wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useOrganizations('user-1'), { wrapper: Wrapper })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeNull()
  })

  it('returns data on successful fetch', async () => {
    const orgs = [{ id: 'org-1', name: 'Acme', slug: 'acme', logo: null, createdAt: '2024-01-01' }]
    mockApiGet.mockResolvedValue(orgs)

    const { Wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useOrganizations('user-1'), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(orgs)
    expect(result.current.error).toBeNull()
  })

  it('exposes error when apiGet rejects', async () => {
    const fetchError = new Error('Unauthorized')
    mockApiGet.mockRejectedValue(fetchError)

    const { Wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useOrganizations('user-2'), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toBe('Unauthorized')
    expect(result.current.data).toBeUndefined()
  })

  it('is disabled when sessionKey is undefined', async () => {
    const { Wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useOrganizations(undefined), { wrapper: Wrapper })

    // Wait a tick to confirm the query is NOT triggered
    await new Promise((r) => setTimeout(r, 50))

    expect(mockApiGet).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('is enabled when sessionKey is null', async () => {
    mockApiGet.mockResolvedValue([])

    const { Wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useOrganizations(null), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockApiGet).toHaveBeenCalled()
    expect(result.current.data).toEqual([])
  })

  it('is enabled when sessionKey is a string', async () => {
    const orgs = [{ id: 'org-2', name: 'Beta', slug: 'beta', logo: null, createdAt: '2024-02-01' }]
    mockApiGet.mockResolvedValue(orgs)

    const { Wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useOrganizations('user-abc'), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockApiGet).toHaveBeenCalledWith('/api/organizations', undefined, expect.anything())
    expect(result.current.data).toEqual(orgs)
  })

  it('refetch calls queryClient.invalidateQueries with ORGANIZATIONS_QUERY_KEY', async () => {
    mockApiGet.mockResolvedValue([])

    const { Wrapper, queryClient } = createQueryWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useOrganizations('user-3'), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    result.current.refetch()

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ORGANIZATIONS_QUERY_KEY,
    })
  })

  it('includes sessionKey in the queryKey', async () => {
    mockApiGet.mockResolvedValue([])

    const { Wrapper, queryClient } = createQueryWrapper()
    const { result } = renderHook(() => useOrganizations('session-xyz'), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Verify the query cache entry has the full key
    const cachedData = queryClient.getQueryData([...ORGANIZATIONS_QUERY_KEY, 'session-xyz'])
    expect(cachedData).toEqual([])
    // Verify different key does not match
    const otherData = queryClient.getQueryData([...ORGANIZATIONS_QUERY_KEY, 'other'])
    expect(otherData).toBeUndefined()
  })
})
