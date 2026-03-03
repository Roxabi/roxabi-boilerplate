import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const captured = vi.hoisted(() => ({
  Component: (() => null) as React.ComponentType,
  beforeLoad: null as ((ctx: unknown) => Promise<void>) | null,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    (config: { component: React.ComponentType; beforeLoad?: (ctx: unknown) => Promise<void> }) => {
      captured.Component = config.component
      captured.beforeLoad = config.beforeLoad ?? null
      return { component: config.component }
    },
  redirect: vi.fn(),
}))

vi.mock('@repo/ui', async () => await import('@/test/__mocks__/repoUi'))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/routePermissions', () => ({
  enforceRoutePermission: vi.fn(),
}))

// Import after mocks to trigger createFileRoute and capture the component
import './feature-flags'
import { toast } from 'sonner'
import { enforceRoutePermission } from '@/lib/routePermissions'

// ---------------------------------------------------------------------------
// QueryClient wrapper for tests
// ---------------------------------------------------------------------------

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = createTestQueryClient()
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function createFeatureFlag(
  overrides: Partial<{
    id: string
    name: string
    key: string
    description: string | null
    enabled: boolean
    createdAt: string
    updatedAt: string
  }> = {}
) {
  return {
    id: overrides.id ?? 'flag-1',
    name: overrides.name ?? 'My Feature',
    key: overrides.key ?? 'my-feature',
    description: overrides.description ?? null,
    enabled: overrides.enabled ?? false,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00Z',
  }
}

function setupFetch(flags: ReturnType<typeof createFeatureFlag>[]) {
  const mockFetch = vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/api/admin/feature-flags')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(flags),
      })
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve(null) })
  })
  globalThis.fetch = mockFetch
  return mockFetch
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FeatureFlagsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(null),
    })
  })

  it('should render the page header with Feature Flags title', async () => {
    // Arrange
    setupFetch([])

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Feature Flags')).toBeInTheDocument()
    })
  })

  it('should render loading skeleton while data is being fetched', () => {
    // Arrange
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should show empty state when no flags exist', async () => {
    // Arrange
    setupFetch([])

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText('No feature flags yet')).toBeInTheDocument()
    })
    expect(screen.getByText('Create your first flag to get started')).toBeInTheDocument()
  })

  it('should render the flag list when flags exist', async () => {
    // Arrange
    setupFetch([
      createFeatureFlag({ id: 'flag-1', name: 'My Feature', key: 'my-feature' }),
      createFeatureFlag({ id: 'flag-2', name: 'Another Flag', key: 'another-flag', enabled: true }),
    ])

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText('My Feature')).toBeInTheDocument()
    })
    expect(screen.getByText('Another Flag')).toBeInTheDocument()
  })

  it('should render flag keys in the list', async () => {
    // Arrange
    setupFetch([createFeatureFlag({ id: 'flag-1', name: 'My Feature', key: 'my-feature' })])

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText('my-feature')).toBeInTheDocument()
    })
  })

  it('should render flag description when present', async () => {
    // Arrange
    setupFetch([
      createFeatureFlag({ id: 'flag-1', name: 'My Feature', description: 'Controls new UI' }),
    ])

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Controls new UI')).toBeInTheDocument()
    })
  })

  it('should not show empty state when flags exist', async () => {
    // Arrange
    setupFetch([createFeatureFlag()])

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText('My Feature')).toBeInTheDocument()
    })
    expect(screen.queryByText('No feature flags yet')).not.toBeInTheDocument()
  })

  it('should not show loading skeleton after data loads', async () => {
    // Arrange
    setupFetch([])

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert — wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('No feature flags yet')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
  })

  it('should render the Create Flag button', async () => {
    // Arrange
    setupFetch([])

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create flag/i })).toBeInTheDocument()
    })
  })

  it('should show toast error when a flag toggle fails', async () => {
    // Arrange
    const flags = [createFeatureFlag({ id: 'flag-1', name: 'My Feature', enabled: false })]
    const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      if (method === 'GET') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(flags) })
      }
      // PATCH fails
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Update failed' }),
      })
    })
    globalThis.fetch = mockFetch

    const Page = captured.Component
    renderWithQueryClient(<Page />)

    await waitFor(() => {
      expect(screen.getByText('My Feature')).toBeInTheDocument()
    })

    // Act — click the switch (role="switch") to toggle
    const switchEl = screen.getByRole('switch')
    switchEl.click()

    // Assert
    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Update failed')
    })
  })
})

describe('beforeLoad', () => {
  it('calls enforceRoutePermission', async () => {
    // Arrange
    vi.mocked(enforceRoutePermission).mockResolvedValue(undefined)
    const ctx = { context: {} }

    // Act
    expect(captured.beforeLoad).not.toBeNull()
    await captured.beforeLoad?.(ctx)

    // Assert
    expect(enforceRoutePermission).toHaveBeenCalledWith(ctx)
  })

  it('propagates redirect when enforceRoutePermission throws', async () => {
    // Arrange
    vi.mocked(enforceRoutePermission).mockRejectedValue(new Error('redirect'))
    const ctx = { context: {} }

    // Act + Assert
    await expect(captured.beforeLoad?.(ctx)).rejects.toThrow('redirect')
  })
})
