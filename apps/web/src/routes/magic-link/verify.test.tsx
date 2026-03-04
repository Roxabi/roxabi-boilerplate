import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { authClient } from '@/lib/authClient'
import { mockParaglideMessages } from '@/test/__mocks__/mockMessages'

const { captured, useSearchFn, useSessionFn, mockNavigate } = vi.hoisted(() => ({
  captured: { Component: (() => null) as React.ComponentType },
  useSearchFn: vi.fn(() => ({
    token: undefined as string | undefined,
    error: undefined as string | undefined,
  })),
  useSessionFn: vi.fn(() => ({
    data: null as { user: { email: string } } | null,
    isPending: false,
  })),
  mockNavigate: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: { validateSearch?: unknown; component: React.ComponentType }) => {
    captured.Component = config.component
    return { component: config.component, useSearch: useSearchFn }
  },
  Link: ({
    children,
    to,
    ...props
  }: React.PropsWithChildren<{ to: string; className?: string }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
}))

vi.mock('@repo/ui', async () => await import('@/test/__mocks__/repoUi'))

vi.mock('@/lib/authClient', () => ({
  useSession: useSessionFn,
  authClient: {
    signOut: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader" className={className} />
  ),
}))

vi.mock('../../components/AuthLayout', () => ({
  AuthLayout: ({
    children,
    title,
  }: React.PropsWithChildren<{ title: string; description?: string }>) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

mockParaglideMessages()

// Import to trigger createFileRoute and capture the component
import './verify'

describe('MagicLinkVerifyPage', () => {
  describe('GuestVerifyFlow — no session', () => {
    it('should show NO_TOKEN error when there is no token and no error', () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: undefined, error: undefined })
      useSessionFn.mockReturnValue({ data: null, isPending: false })
      const MagicLinkVerifyPage = captured.Component

      // Act
      render(<MagicLinkVerifyPage />)

      // Assert
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('auth_missing_token')).toBeInTheDocument()
    })

    it('should show back-to-sign-in link when NO_TOKEN error', () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: undefined, error: undefined })
      useSessionFn.mockReturnValue({ data: null, isPending: false })
      const MagicLinkVerifyPage = captured.Component

      // Act
      render(<MagicLinkVerifyPage />)

      // Assert
      const link = screen.getByRole('link', { name: /auth_back_to_sign_in/ })
      expect(link).toHaveAttribute('href', '/login')
    })

    it('should show expired error and "request new link" button when error=EXPIRED_TOKEN', () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: undefined, error: 'EXPIRED_TOKEN' })
      useSessionFn.mockReturnValue({ data: null, isPending: false })
      const MagicLinkVerifyPage = captured.Component

      // Act
      render(<MagicLinkVerifyPage />)

      // Assert
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('auth_magic_link_expired')).toBeInTheDocument()
      const link = screen.getByRole('link', { name: 'auth_magic_link_request_new' })
      expect(link).toHaveAttribute('href', '/login')
    })

    it('should show invalid error and back-to-sign-in link when error=INVALID_TOKEN', () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: undefined, error: 'INVALID_TOKEN' })
      useSessionFn.mockReturnValue({ data: null, isPending: false })
      const MagicLinkVerifyPage = captured.Component

      // Act
      render(<MagicLinkVerifyPage />)

      // Assert
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('auth_magic_link_invalid')).toBeInTheDocument()
      const link = screen.getByRole('link', { name: /auth_back_to_sign_in/ })
      expect(link).toHaveAttribute('href', '/login')
    })

    it('should show unknown error and back-to-sign-in link when error is unrecognized', () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: undefined, error: 'SOMETHING_ELSE' })
      useSessionFn.mockReturnValue({ data: null, isPending: false })
      const MagicLinkVerifyPage = captured.Component

      // Act
      render(<MagicLinkVerifyPage />)

      // Assert
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('auth_magic_link_unknown_error')).toBeInTheDocument()
      const link = screen.getByRole('link', { name: /auth_back_to_sign_in/ })
      expect(link).toHaveAttribute('href', '/login')
    })

    it('should show verifying spinner and redirect to API endpoint when token is present and no error', async () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: 'tok_abc123', error: undefined })
      useSessionFn.mockReturnValue({ data: null, isPending: false })
      // Spy on the window.location href setter to capture the redirect URL
      let capturedHref = ''
      const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location')
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: {
          ...window.location,
          origin: 'http://localhost',
          set href(url: string) {
            capturedHref = url
          },
          get href() {
            return capturedHref
          },
        },
      })
      const MagicLinkVerifyPage = captured.Component

      // Act
      render(<MagicLinkVerifyPage />)

      // Assert — spinner is visible
      expect(screen.getByTestId('loader')).toBeInTheDocument()
      expect(screen.getByText('auth_magic_link_verifying')).toBeInTheDocument()

      // Assert — window.location.href is set to the API verify endpoint
      await waitFor(() => {
        expect(capturedHref).toContain('/api/auth/magic-link/verify')
        expect(capturedHref).toContain('token=tok_abc123')
        expect(capturedHref).toContain(
          'errorCallbackURL=http%3A%2F%2Flocalhost%2Fmagic-link%2Fverify'
        )
      })

      // Cleanup
      if (locationDescriptor) {
        Object.defineProperty(window, 'location', locationDescriptor)
      }
    })

    it('should not redirect to API when token is present but error is also set', () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: 'tok_abc123', error: 'EXPIRED_TOKEN' })
      useSessionFn.mockReturnValue({ data: null, isPending: false })
      const locationSpy = vi.spyOn(window, 'location', 'get')
      const MagicLinkVerifyPage = captured.Component

      // Act
      render(<MagicLinkVerifyPage />)

      // Assert — error state is shown, no location redirect occurred
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('auth_magic_link_expired')).toBeInTheDocument()
      locationSpy.mockRestore()
    })
  })

  describe('isPending — session loading', () => {
    it('should show verifying spinner while session is loading', () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: undefined, error: undefined })
      useSessionFn.mockReturnValue({ data: null, isPending: true })
      const MagicLinkVerifyPage = captured.Component

      // Act
      render(<MagicLinkVerifyPage />)

      // Assert
      expect(screen.getByTestId('loader')).toBeInTheDocument()
      expect(screen.getByText('auth_magic_link_verifying')).toBeInTheDocument()
    })
  })

  describe('WarningState — session + token', () => {
    it('should show already-signed-in warning with user email when session and token are present', () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: 'tok_abc123', error: undefined })
      useSessionFn.mockReturnValue({
        data: { user: { email: 'ada@example.com' } },
        isPending: false,
      })
      const MagicLinkVerifyPage = captured.Component

      // Act
      render(<MagicLinkVerifyPage />)

      // Assert
      expect(
        screen.getByText('auth_magic_link_already_signed_in({"email":"ada@example.com"})')
      ).toBeInTheDocument()
    })

    it('should render sign-out button when session and token are present', () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: 'tok_abc123', error: undefined })
      useSessionFn.mockReturnValue({
        data: { user: { email: 'ada@example.com' } },
        isPending: false,
      })
      const MagicLinkVerifyPage = captured.Component

      // Act
      render(<MagicLinkVerifyPage />)

      // Assert
      expect(
        screen.getByRole('button', { name: 'auth_magic_link_sign_out_first' })
      ).toBeInTheDocument()
    })

    it('should render go-to-dashboard link when session and token are present', () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: 'tok_abc123', error: undefined })
      useSessionFn.mockReturnValue({
        data: { user: { email: 'ada@example.com' } },
        isPending: false,
      })
      const MagicLinkVerifyPage = captured.Component

      // Act
      render(<MagicLinkVerifyPage />)

      // Assert
      const link = screen.getByRole('link', { name: 'auth_magic_link_go_to_dashboard' })
      expect(link).toHaveAttribute('href', '/dashboard')
    })

    it('should call authClient.signOut and reload when sign-out button is clicked', async () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: 'tok_abc123', error: undefined })
      useSessionFn.mockReturnValue({
        data: { user: { email: 'ada@example.com' } },
        isPending: false,
      })
      vi.mocked(authClient.signOut).mockResolvedValueOnce({} as never)
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: { ...window.location, reload: reloadMock },
      })
      const MagicLinkVerifyPage = captured.Component
      render(<MagicLinkVerifyPage />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'auth_magic_link_sign_out_first' }))

      // Assert
      await waitFor(() => {
        expect(authClient.signOut).toHaveBeenCalled()
        expect(reloadMock).toHaveBeenCalled()
      })
    })

    it('should show spinner on sign-out button while signing out', async () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: 'tok_abc123', error: undefined })
      useSessionFn.mockReturnValue({
        data: { user: { email: 'ada@example.com' } },
        isPending: false,
      })
      // Never resolves to keep the pending state visible
      vi.mocked(authClient.signOut).mockReturnValueOnce(new Promise(() => {}) as never)
      const MagicLinkVerifyPage = captured.Component
      render(<MagicLinkVerifyPage />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'auth_magic_link_sign_out_first' }))

      // Assert — loader replaces button text while signing out
      await waitFor(() => {
        expect(screen.getByTestId('loader')).toBeInTheDocument()
        expect(screen.queryByText('auth_magic_link_sign_out_first')).not.toBeInTheDocument()
      })
    })

    it('should re-enable sign-out button when signOut throws', async () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: 'tok_abc123', error: undefined })
      useSessionFn.mockReturnValue({
        data: { user: { email: 'ada@example.com' } },
        isPending: false,
      })
      // Return a promise that rejects to simulate network failure
      vi.mocked(authClient.signOut).mockImplementationOnce(() =>
        Promise.reject(new Error('Network error'))
      )
      const MagicLinkVerifyPage = captured.Component
      render(<MagicLinkVerifyPage />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'auth_magic_link_sign_out_first' }))

      // Assert — spinner appears briefly (signingOut=true) then button text reappears (signingOut=false)
      await waitFor(() => {
        expect(screen.getByText('auth_magic_link_sign_out_first')).toBeInTheDocument()
      })
      expect(
        screen.getByRole('button', { name: 'auth_magic_link_sign_out_first' })
      ).not.toBeDisabled()
    })
  })

  describe('Session + no token + no error → redirect to dashboard', () => {
    it('should call navigate to /dashboard when session exists but no token and no error', async () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: undefined, error: undefined })
      useSessionFn.mockReturnValue({
        data: { user: { email: 'ada@example.com' } },
        isPending: false,
      })
      const MagicLinkVerifyPage = captured.Component

      // Act
      render(<MagicLinkVerifyPage />)

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' })
      })
    })

    it('should render nothing (null) while navigating when session exists but no token and no error', () => {
      // Arrange
      useSearchFn.mockReturnValue({ token: undefined, error: undefined })
      useSessionFn.mockReturnValue({
        data: { user: { email: 'ada@example.com' } },
        isPending: false,
      })
      const MagicLinkVerifyPage = captured.Component

      // Act
      const { container } = render(<MagicLinkVerifyPage />)

      // Assert — component returns null, no visible content
      expect(container.firstChild).toBeNull()
    })
  })
})
