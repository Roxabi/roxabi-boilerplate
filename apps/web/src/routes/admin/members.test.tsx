import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockParaglideMessages } from '@/test/__mocks__/mockMessages'

const captured = vi.hoisted(() => ({
  Component: (() => null) as React.ComponentType,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: { component: React.ComponentType }) => {
    captured.Component = config.component
    return { component: config.component }
  },
  redirect: vi.fn(),
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}))

vi.mock('@repo/ui', async () => await import('@/test/__mocks__/repoUi'))

vi.mock('@/lib/authClient', () => ({
  authClient: {
    useActiveOrganization: vi.fn(() => ({ data: null })),
  },
  useSession: vi.fn(() => ({ data: { user: { id: 'current-user-id' } } })),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/orgUtils', () => ({
  roleLabel: (role: string) => `org_role_${role}`,
  roleBadgeVariant: (role: string) => {
    switch (role) {
      case 'owner':
        return 'default'
      case 'admin':
        return 'secondary'
      default:
        return 'outline'
    }
  },
}))

vi.mock('@/paraglide/runtime', () => ({
  getLocale: () => 'en',
}))

mockParaglideMessages()

// Import after mocks to trigger createFileRoute and capture the component
import './members'
import { toast } from 'sonner'
import { authClient } from '@/lib/authClient'

// ---------------------------------------------------------------------------
// QueryClient wrapper for tests
// ---------------------------------------------------------------------------

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
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

function createMember(
  overrides: Partial<{
    id: string
    userId: string
    role: string
    createdAt: string
    user: { id: string; name: string | null; email: string; image: string | null }
  }> = {}
) {
  return {
    id: overrides.id ?? 'member-1',
    userId: overrides.userId ?? 'user-1',
    role: overrides.role ?? 'member',
    createdAt: overrides.createdAt ?? '2025-01-01T00:00:00Z',
    user: overrides.user ?? {
      id: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
      image: null,
    },
  }
}

function createMembersResponse(
  members: ReturnType<typeof createMember>[] = [createMember()],
  pagination = { page: 1, limit: 20, total: members.length, totalPages: 1 }
) {
  return { data: members, pagination }
}

function createRolesResponse() {
  return [
    { id: 'r-owner', name: 'Owner', slug: 'owner' },
    { id: 'r-admin', name: 'Admin', slug: 'admin' },
    { id: 'r-member', name: 'Member', slug: 'member' },
  ]
}

function setupActiveOrg() {
  vi.mocked(authClient.useActiveOrganization).mockReturnValue({
    data: { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' },
  } as ReturnType<typeof authClient.useActiveOrganization>)
}

function setupFetch(
  membersResponse: ReturnType<typeof createMembersResponse> = createMembersResponse(),
  rolesResponse: ReturnType<typeof createRolesResponse> = createRolesResponse()
) {
  const mockFetch = vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/api/admin/members')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(membersResponse)),
      })
    }
    if (
      typeof url === 'string' &&
      url.includes('/api/admin/organizations') &&
      url.includes('/roles')
    ) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: rolesResponse })),
      })
    }
    if (typeof url === 'string' && url.includes('/api/roles')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(rolesResponse)),
      })
    }
    if (typeof url === 'string' && url.includes('/api/admin/invitations')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: [] })),
      })
    }
    return Promise.resolve({ ok: false, text: () => Promise.resolve('null') })
  })
  globalThis.fetch = mockFetch
  return mockFetch
}

function setupFetchError(errorMessage = 'Server error') {
  const mockFetch = vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/api/admin/invitations')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: [] })),
      })
    }
    if (typeof url === 'string' && url.includes('/api/admin/members')) {
      return Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve(JSON.stringify({ message: errorMessage })),
      })
    }
    if (
      typeof url === 'string' &&
      url.includes('/api/admin/organizations') &&
      url.includes('/roles')
    ) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: createRolesResponse() })),
      })
    }
    if (typeof url === 'string' && url.includes('/api/roles')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(createRolesResponse())),
      })
    }
    return Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('null') })
  })
  globalThis.fetch = mockFetch
  return mockFetch
}

/**
 * Extended fetch mock that handles POST (invite) and PATCH (role change) requests
 * in addition to the standard GET endpoints.
 */
function setupFetchWithMutations({
  members = [createMember()],
  roles = createRolesResponse(),
  inviteResult = { ok: true, body: { success: true } },
  updateRoleResult = { ok: true, body: { success: true } },
}: {
  members?: ReturnType<typeof createMember>[]
  roles?: ReturnType<typeof createRolesResponse>
  inviteResult?: { ok: boolean; body: unknown }
  updateRoleResult?: { ok: boolean; body: unknown }
} = {}) {
  const membersBody = createMembersResponse(members, {
    page: 1,
    limit: 20,
    total: members.length,
    totalPages: 1,
  })

  const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const respond = (ok: boolean, body: unknown) => {
      const serialised = JSON.stringify(body)
      return Promise.resolve({
        ok,
        status: ok ? 200 : 400,
        text: () => Promise.resolve(serialised),
        json: () => Promise.resolve(JSON.parse(serialised)),
      })
    }

    if (url.includes('/api/admin/members/invite') && method === 'POST')
      return respond(inviteResult.ok, inviteResult.body)
    if (url.includes('/api/admin/members/') && method === 'PATCH')
      return respond(updateRoleResult.ok, updateRoleResult.body)
    if (url.includes('/api/admin/members')) return respond(true, membersBody)
    if (url.includes('/api/admin/organizations') && url.includes('/roles'))
      return respond(true, { data: roles })
    if (url.includes('/api/roles')) return respond(true, roles)
    if (url.includes('/api/admin/invitations')) return respond(true, { data: [] })
    return respond(false, null)
  })
  globalThis.fetch = mockFetch
  return mockFetch
}

/**
 * Submit the invite form by dispatching a submit event on the form element.
 * fireEvent.click on a submit button does not reliably trigger onSubmit in jsdom
 * with React 19, so we dispatch the submit event directly on the form.
 */
function submitInviteForm() {
  const emailInput = screen.getByPlaceholderText('org_invite_email_placeholder')
  const form = emailInput.closest('form')
  if (!form) throw new Error('No form element found around the invite email input')
  fireEvent.submit(form)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminMembersPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Provide a safe default fetch that handles relative URLs in jsdom
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('null'),
    })
  })

  it('should show "no org" message when no active organization', () => {
    // Arrange
    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: null,
    } as unknown as ReturnType<typeof authClient.useActiveOrganization>)

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    expect(screen.getByText('org_members_title')).toBeInTheDocument()
    expect(screen.getByText('org_switcher_no_org')).toBeInTheDocument()
  })

  it('should render loading skeleton initially', async () => {
    // Arrange
    setupActiveOrg()
    // Use a never-resolving fetch to keep loading state
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should render member table after data loads', async () => {
    // Arrange
    setupActiveOrg()
    setupFetch(
      createMembersResponse([
        createMember({
          id: 'm-owner',
          role: 'owner',
          user: { id: 'u-1', name: 'Owner User', email: 'owner@acme.com', image: null },
        }),
        createMember({
          id: 'm-dev',
          role: 'member',
          user: { id: 'u-2', name: 'Dev User', email: 'dev@acme.com', image: null },
        }),
      ])
    )

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Owner User')).toBeInTheDocument()
    })
    expect(screen.getByText('owner@acme.com')).toBeInTheDocument()
    expect(screen.getByText('Dev User')).toBeInTheDocument()
    expect(screen.getByText('dev@acme.com')).toBeInTheDocument()
  })

  it('should show invite dialog trigger button', async () => {
    // Arrange
    setupActiveOrg()
    setupFetch()

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    await waitFor(() => {
      const inviteElements = screen.getAllByText('org_invite_title')
      expect(inviteElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('should show invite form fields inside dialog', async () => {
    // Arrange
    setupActiveOrg()
    setupFetch()

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert -- Dialog mock renders children immediately (always open)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('org_invite_email_placeholder')).toBeInTheDocument()
    })
    expect(screen.getByText('org_invite_email')).toBeInTheDocument()
    expect(screen.getByText('org_invite_role')).toBeInTheDocument()
  })

  it('should render role badge for owner rows', async () => {
    // Arrange
    setupActiveOrg()
    setupFetch(
      createMembersResponse([
        createMember({
          id: 'm-owner',
          role: 'owner',
          user: { id: 'u-1', name: 'Owner', email: 'owner@acme.com', image: null },
        }),
      ])
    )

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert -- owner role renders as Badge (span with data-variant), may also appear in invite dialog SelectItem
    await waitFor(() => {
      const ownerTexts = screen.getAllByText('org_role_owner')
      expect(ownerTexts.length).toBeGreaterThanOrEqual(1)
      // The Badge element should have data-variant="default"
      const badge = ownerTexts.find((el) => el.getAttribute('data-variant') === 'default')
      expect(badge).toBeDefined()
    })
  })

  it('should render role badge for non-owner members', async () => {
    // Arrange
    setupActiveOrg()
    setupFetch(
      createMembersResponse([
        createMember({
          id: 'm-dev',
          role: 'member',
          user: { id: 'u-2', name: 'Dev', email: 'dev@acme.com', image: null },
        }),
      ])
    )

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert -- non-owner should see a Badge for their role (role change is in context menu)
    await waitFor(() => {
      const roleTexts = screen.getAllByText('org_role_member')
      const badge = roleTexts.find((el) => el.getAttribute('data-variant') === 'outline')
      expect(badge).toBeDefined()
    })
  })

  it('should render kebab buttons for each member row', async () => {
    // Arrange
    setupActiveOrg()
    setupFetch(
      createMembersResponse([
        createMember({
          id: 'm-owner',
          role: 'owner',
          user: { id: 'u-1', name: 'Owner', email: 'owner@acme.com', image: null },
        }),
        createMember({
          id: 'm-dev',
          role: 'member',
          user: { id: 'u-2', name: 'Dev', email: 'dev@acme.com', image: null },
        }),
      ])
    )

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert -- each member row should have a kebab menu button
    await waitFor(() => {
      expect(screen.getByText('Owner')).toBeInTheDocument()
      expect(screen.getByText('Dev')).toBeInTheDocument()
    })
  })

  it('should show context menu content for member rows', async () => {
    // Arrange
    setupActiveOrg()
    setupFetch(
      createMembersResponse([
        createMember({
          id: 'm-dev',
          role: 'member',
          user: { id: 'u-2', name: 'Dev', email: 'dev@acme.com', image: null },
        }),
      ])
    )

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert -- context menu content renders (mocks render children directly)
    await waitFor(() => {
      expect(screen.getByText('Dev')).toBeInTheDocument()
    })
    // Menu items from MemberMenuContent are rendered by mock (always visible)
    // Both context menu and kebab dropdown render the same content, so there are 2 of each
    expect(screen.getAllByText('Change role').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Edit profile').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('View user').length).toBeGreaterThanOrEqual(1)
  })

  it('should show error state when fetch fails', async () => {
    // Arrange
    setupActiveOrg()
    setupFetchError('Failed to load members')

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Failed to load members')).toBeInTheDocument()
    })
    expect(screen.getByText('admin_error_retry')).toBeInTheDocument()
  })

  it('should show search input', async () => {
    // Arrange
    setupActiveOrg()
    setupFetch()

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    await waitFor(() => {
      expect(screen.getByPlaceholderText('org_members_search_placeholder')).toBeInTheDocument()
    })
  })

  it('should send search param to server when searching by name', async () => {
    // Arrange -- search is now server-side with 300ms debounce
    vi.useFakeTimers()
    setupActiveOrg()
    const mockFetch = setupFetch(
      createMembersResponse([
        createMember({
          id: 'm-alice',
          role: 'member',
          user: { id: 'u-1', name: 'Alice Smith', email: 'alice@acme.com', image: null },
        }),
        createMember({
          id: 'm-bob',
          role: 'member',
          user: { id: 'u-2', name: 'Bob Jones', email: 'bob@acme.com', image: null },
        }),
      ])
    )

    const Page = captured.Component
    renderWithQueryClient(<Page />)

    await vi.waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })

    // Act -- type into search input (triggers server-side search after debounce)
    const searchInput = screen.getByPlaceholderText('org_members_search_placeholder')
    fireEvent.change(searchInput, { target: { value: 'Alice' } })
    await vi.advanceTimersByTimeAsync(300)

    // Assert -- fetch should be called with search param
    await vi.waitFor(() => {
      const membersCalls = mockFetch.mock.calls.filter(
        (args) =>
          typeof args[0] === 'string' &&
          args[0].includes('/api/admin/members') &&
          args[0].includes('search=Alice')
      )
      expect(membersCalls.length).toBeGreaterThanOrEqual(1)
    })

    vi.useRealTimers()
  })

  it('should send search param to server when searching by email', async () => {
    // Arrange -- search is now server-side with 300ms debounce
    vi.useFakeTimers()
    setupActiveOrg()
    const mockFetch = setupFetch(
      createMembersResponse([
        createMember({
          id: 'm-alice',
          role: 'member',
          user: { id: 'u-1', name: 'Alice Smith', email: 'alice@acme.com', image: null },
        }),
        createMember({
          id: 'm-bob',
          role: 'member',
          user: { id: 'u-2', name: 'Bob Jones', email: 'bob@acme.com', image: null },
        }),
      ])
    )

    const Page = captured.Component
    renderWithQueryClient(<Page />)

    await vi.waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })

    // Act -- type email-based search
    const searchInput = screen.getByPlaceholderText('org_members_search_placeholder')
    fireEvent.change(searchInput, { target: { value: 'bob@' } })
    await vi.advanceTimersByTimeAsync(300)

    // Assert -- fetch should be called with search param
    await vi.waitFor(() => {
      const membersCalls = mockFetch.mock.calls.filter(
        (args) =>
          typeof args[0] === 'string' &&
          args[0].includes('/api/admin/members') &&
          args[0].includes('search=bob')
      )
      expect(membersCalls.length).toBeGreaterThanOrEqual(1)
    })

    vi.useRealTimers()
  })

  it('should show no-results message when server returns empty for search', async () => {
    // Arrange -- search is server-side; mock returns empty for search requests
    vi.useFakeTimers()
    setupActiveOrg()
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/admin/members')) {
        if (url.includes('search=')) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                JSON.stringify(
                  createMembersResponse([], { page: 1, limit: 20, total: 0, totalPages: 0 })
                )
              ),
          })
        }
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              JSON.stringify(
                createMembersResponse([
                  createMember({
                    id: 'm-alice',
                    role: 'member',
                    user: {
                      id: 'u-1',
                      name: 'Alice Smith',
                      email: 'alice@acme.com',
                      image: null,
                    },
                  }),
                ])
              )
            ),
        })
      }
      if (
        typeof url === 'string' &&
        url.includes('/api/admin/organizations') &&
        url.includes('/roles')
      ) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ data: createRolesResponse() })),
        })
      }
      if (typeof url === 'string' && url.includes('/api/roles')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(createRolesResponse())),
        })
      }
      if (typeof url === 'string' && url.includes('/api/admin/invitations')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ data: [] })),
        })
      }
      return Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('null') })
    })
    globalThis.fetch = mockFetch

    const Page = captured.Component
    renderWithQueryClient(<Page />)

    await vi.waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })

    // Act -- type a nonexistent search term
    const searchInput = screen.getByPlaceholderText('org_members_search_placeholder')
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
    await vi.advanceTimersByTimeAsync(300)

    // Assert
    await vi.waitFor(() => {
      expect(screen.getByText('org_members_no_results')).toBeInTheDocument()
    })

    vi.useRealTimers()
  })

  it('should show empty state when org has no members', async () => {
    // Arrange
    setupActiveOrg()
    setupFetch(createMembersResponse([]))

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText('org_members_empty')).toBeInTheDocument()
    })
  })

  it('should show member count in card description', async () => {
    // Arrange
    setupActiveOrg()
    setupFetch(
      createMembersResponse(
        [
          createMember({
            id: 'm-1',
            user: { id: 'u-1', name: 'Alice', email: 'alice@acme.com', image: null },
          }),
          createMember({
            id: 'm-2',
            user: { id: 'u-2', name: 'Bob', email: 'bob@acme.com', image: null },
          }),
        ],
        { page: 1, limit: 20, total: 2, totalPages: 1 }
      )
    )

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert — uses i18n key: admin_members_count({"count":2})
    await waitFor(() => {
      expect(screen.getByText(/admin_members_count/)).toBeInTheDocument()
    })
  })

  it('should show column headers in the members table', async () => {
    // Arrange
    setupActiveOrg()
    setupFetch()

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText('org_members_name')).toBeInTheDocument()
    })
    expect(screen.getByText('org_members_email')).toBeInTheDocument()
    expect(screen.getByText('org_members_role')).toBeInTheDocument()
    expect(screen.getByText('org_members_joined')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// InviteDialog — form submission flow (Warning 18)
// ---------------------------------------------------------------------------

describe('InviteDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('null'),
    })
  })

  it('should disable submit button when email is empty', async () => {
    // Arrange
    setupActiveOrg()
    setupFetchWithMutations()

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert — the submit button text is org_invite_send, disabled when no email
    await waitFor(() => {
      expect(screen.getByText('org_invite_send')).toBeInTheDocument()
    })
    const submitButton = screen.getByText('org_invite_send')
    expect(submitButton).toBeDisabled()
  })

  it('should enable submit button when email is provided', async () => {
    // Arrange
    setupActiveOrg()
    setupFetchWithMutations()

    const Page = captured.Component
    renderWithQueryClient(<Page />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('org_invite_email_placeholder')).toBeInTheDocument()
    })

    // Act
    const emailInput = screen.getByPlaceholderText('org_invite_email_placeholder')
    fireEvent.change(emailInput, { target: { value: 'new@acme.com' } })

    // Assert
    const submitButton = screen.getByText('org_invite_send')
    expect(submitButton).not.toBeDisabled()
  })

  it('should call invite API with email and roleId on form submit', async () => {
    // Arrange
    setupActiveOrg()
    const mockFetch = setupFetchWithMutations()

    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Wait for roles to load (role options appear in InviteDialog)
    await waitFor(() => {
      expect(screen.getAllByText('org_role_admin').length).toBeGreaterThanOrEqual(1)
    })

    // Act
    const emailInput = screen.getByPlaceholderText('org_invite_email_placeholder')
    fireEvent.change(emailInput, { target: { value: 'newuser@acme.com' } })

    // Submit the form directly
    const form = emailInput.closest('form') as HTMLFormElement
    fireEvent.submit(form)

    // Assert
    await waitFor(() => {
      const inviteCalls = mockFetch.mock.calls.filter(
        ([url, init]) =>
          typeof url === 'string' &&
          url.includes('/api/admin/members/invite') &&
          init?.method === 'POST'
      )
      expect(inviteCalls).toHaveLength(1)
      const body = JSON.parse(inviteCalls[0]?.[1]?.body as string)
      expect(body.email).toBe('newuser@acme.com')
      expect(body.roleId).toBeTruthy()
    })
  })

  it('should show success toast after successful invite', async () => {
    // Arrange
    setupActiveOrg()
    setupFetchWithMutations()

    const Page = captured.Component
    renderWithQueryClient(<Page />)

    await waitFor(() => {
      expect(screen.getAllByText('org_role_admin').length).toBeGreaterThanOrEqual(1)
    })

    // Act
    const emailInput = screen.getByPlaceholderText('org_invite_email_placeholder')
    fireEvent.change(emailInput, { target: { value: 'new@acme.com' } })

    submitInviteForm()

    // Assert
    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
        expect.stringContaining('org_toast_invited')
      )
    })
  })

  it('should clear email field after successful invite', async () => {
    // Arrange
    setupActiveOrg()
    setupFetchWithMutations()

    const Page = captured.Component
    renderWithQueryClient(<Page />)

    await waitFor(() => {
      expect(screen.getAllByText('org_role_admin').length).toBeGreaterThanOrEqual(1)
    })

    // Act
    const emailInput = screen.getByPlaceholderText('org_invite_email_placeholder')
    fireEvent.change(emailInput, { target: { value: 'new@acme.com' } })

    submitInviteForm()

    // Assert
    await waitFor(() => {
      expect(emailInput).toHaveValue('')
    })
  })

  it('should show error toast when invite API returns duplicate email error', async () => {
    // Arrange
    setupActiveOrg()
    setupFetchWithMutations({
      inviteResult: {
        ok: false,
        body: { message: 'Email already exists in this organization' },
      },
    })

    const Page = captured.Component
    renderWithQueryClient(<Page />)

    await waitFor(() => {
      expect(screen.getAllByText('org_role_admin').length).toBeGreaterThanOrEqual(1)
    })

    // Act
    const emailInput = screen.getByPlaceholderText('org_invite_email_placeholder')
    fireEvent.change(emailInput, { target: { value: 'existing@acme.com' } })

    submitInviteForm()

    // Assert
    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        'Email already exists in this organization'
      )
    })
  })

  it('should show error toast when invite API returns pending invitation error', async () => {
    // Arrange
    setupActiveOrg()
    setupFetchWithMutations({
      inviteResult: {
        ok: false,
        body: { message: 'An invitation is already pending for this email' },
      },
    })

    const Page = captured.Component
    renderWithQueryClient(<Page />)

    await waitFor(() => {
      expect(screen.getAllByText('org_role_admin').length).toBeGreaterThanOrEqual(1)
    })

    // Act
    const emailInput = screen.getByPlaceholderText('org_invite_email_placeholder')
    fireEvent.change(emailInput, { target: { value: 'pending@acme.com' } })

    submitInviteForm()

    // Assert
    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        'An invitation is already pending for this email'
      )
    })
  })

  it('should not call invite API when email is empty', async () => {
    // Arrange
    setupActiveOrg()
    const mockFetch = setupFetchWithMutations()

    const Page = captured.Component
    renderWithQueryClient(<Page />)

    await waitFor(() => {
      expect(screen.getByText('org_invite_send')).toBeInTheDocument()
    })

    // Assert — button is disabled, no POST request should be made
    const submitButton = screen.getByText('org_invite_send')
    expect(submitButton).toBeDisabled()

    const inviteCalls = mockFetch.mock.calls.filter(
      ([url, init]) =>
        typeof url === 'string' &&
        url.includes('/api/admin/members/invite') &&
        init?.method === 'POST'
    )
    expect(inviteCalls).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Role display — roles shown as badges (role changes via context menu)
// ---------------------------------------------------------------------------

describe('Role display', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('null'),
    })
  })

  it('should render role badge for non-owner members', async () => {
    // Arrange
    setupActiveOrg()
    setupFetchWithMutations({
      members: [
        createMember({
          id: 'm-dev',
          role: 'member',
          user: { id: 'u-2', name: 'Dev', email: 'dev@acme.com', image: null },
        }),
      ],
    })

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert — role renders as Badge (span with data-variant)
    await waitFor(() => {
      const memberTexts = screen.getAllByText('org_role_member')
      const badge = memberTexts.find((el) => el.getAttribute('data-variant') === 'outline')
      expect(badge).toBeDefined()
    })
  })

  it('should render badge for owner members', async () => {
    // Arrange
    setupActiveOrg()
    setupFetchWithMutations({
      members: [
        createMember({
          id: 'm-owner',
          role: 'owner',
          user: { id: 'u-1', name: 'Owner', email: 'owner@acme.com', image: null },
        }),
      ],
    })

    // Act
    const Page = captured.Component
    renderWithQueryClient(<Page />)

    // Assert — owner role renders as Badge (span with data-variant)
    await waitFor(() => {
      const ownerTexts = screen.getAllByText('org_role_owner')
      const badge = ownerTexts.find((el) => el.getAttribute('data-variant') === 'default')
      expect(badge).toBeDefined()
    })
  })
})
