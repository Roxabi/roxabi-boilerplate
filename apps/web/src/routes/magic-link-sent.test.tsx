import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mockParaglideMessages } from '@/test/__mocks__/mockMessages'

const { captured, useSearchFn } = vi.hoisted(() => ({
  captured: { Component: (() => null) as React.ComponentType },
  useSearchFn: vi.fn(() => ({ email: undefined as string | undefined })),
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
}))

vi.mock('@repo/ui', async () => await import('@/test/__mocks__/repoUi'))

vi.mock('@/lib/authClient', () => ({
  authClient: {
    signIn: {
      magicLink: vi.fn(),
    },
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../components/AuthLayout', () => ({
  AuthLayout: ({
    children,
    title,
    description,
  }: React.PropsWithChildren<{ title: string; description?: string }>) => (
    <div>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {children}
    </div>
  ),
}))

vi.mock('lucide-react', () => ({
  ExternalLink: () => <span data-testid="external-link-icon" />,
}))

mockParaglideMessages()

import { toast } from 'sonner'
import { authClient } from '@/lib/authClient'
// Import to trigger createFileRoute and capture the component
import { detectEmailProvider } from './magic-link-sent'

describe('MagicLinkSentPage', () => {
  it('should render title and description when component mounts', () => {
    // Arrange
    useSearchFn.mockReturnValue({ email: undefined })
    const MagicLinkSentPage = captured.Component

    // Act
    render(<MagicLinkSentPage />)

    // Assert
    expect(screen.getByText('auth_magic_link_sent_title')).toBeInTheDocument()
    expect(screen.getByText('auth_magic_link_sent_desc')).toBeInTheDocument()
  })

  it('should show email-specific message when email is provided', () => {
    // Arrange
    useSearchFn.mockReturnValue({ email: 'user@example.com' })
    const MagicLinkSentPage = captured.Component

    // Act
    render(<MagicLinkSentPage />)

    // Assert
    expect(
      screen.getByText('auth_magic_link_sent_message({"email":"user@example.com"})')
    ).toBeInTheDocument()
  })

  it('should show generic message when no email is provided', () => {
    // Arrange
    useSearchFn.mockReturnValue({ email: undefined })
    const MagicLinkSentPage = captured.Component

    // Act
    render(<MagicLinkSentPage />)

    // Assert
    expect(screen.getByText('auth_check_email_magic_link')).toBeInTheDocument()
  })

  it('should show resend button when email is present', () => {
    // Arrange
    useSearchFn.mockReturnValue({ email: 'user@example.com' })
    const MagicLinkSentPage = captured.Component

    // Act
    render(<MagicLinkSentPage />)

    // Assert
    expect(screen.getByRole('button', { name: 'auth_resend_magic_link' })).toBeInTheDocument()
    expect(screen.getByText('auth_didnt_receive')).toBeInTheDocument()
  })

  it('should not show resend button when no email is present', () => {
    // Arrange
    useSearchFn.mockReturnValue({ email: undefined })
    const MagicLinkSentPage = captured.Component

    // Act
    render(<MagicLinkSentPage />)

    // Assert
    expect(screen.queryByRole('button', { name: 'auth_resend_magic_link' })).not.toBeInTheDocument()
  })

  it('should render back to sign in link when component mounts', () => {
    // Arrange
    useSearchFn.mockReturnValue({ email: undefined })
    const MagicLinkSentPage = captured.Component

    // Act
    render(<MagicLinkSentPage />)

    // Assert
    const link = screen.getByRole('link', { name: /auth_back_to_sign_in/ })
    expect(link).toHaveAttribute('href', '/login')
  })

  it('should call authClient.signIn.magicLink when resend button is clicked', async () => {
    // Arrange
    vi.mocked(authClient.signIn.magicLink).mockResolvedValueOnce({
      error: null,
      data: null,
    } as never)
    useSearchFn.mockReturnValue({ email: 'user@example.com' })
    const MagicLinkSentPage = captured.Component

    // Act
    render(<MagicLinkSentPage />)
    fireEvent.click(screen.getByRole('button', { name: 'auth_resend_magic_link' }))

    // Assert
    await waitFor(() => {
      expect(authClient.signIn.magicLink).toHaveBeenCalledWith({
        email: 'user@example.com',
        callbackURL: `${window.location.origin}/dashboard`,
      })
    })
    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith('auth_toast_magic_link_resent')
    })
  })

  it('should show error toast when resend returns an error', async () => {
    // Arrange
    vi.mocked(authClient.signIn.magicLink).mockResolvedValueOnce({
      error: { message: 'Rate limited' },
      data: null,
    } as never)
    useSearchFn.mockReturnValue({ email: 'user@example.com' })
    const MagicLinkSentPage = captured.Component

    // Act
    render(<MagicLinkSentPage />)
    fireEvent.click(screen.getByRole('button', { name: 'auth_resend_magic_link' }))

    // Assert
    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Rate limited')
    })
  })

  it('should show error toast when resend throws an exception', async () => {
    // Arrange
    vi.mocked(authClient.signIn.magicLink).mockRejectedValueOnce(new Error('Network error'))
    useSearchFn.mockReturnValue({ email: 'user@example.com' })
    const MagicLinkSentPage = captured.Component

    // Act
    render(<MagicLinkSentPage />)
    fireEvent.click(screen.getByRole('button', { name: 'auth_resend_magic_link' }))

    // Assert
    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('auth_toast_error')
    })
  })
})

describe('detectEmailProvider', () => {
  it('should detect Gmail when given a gmail.com address', () => {
    // Arrange & Act
    const result = detectEmailProvider('user@gmail.com')

    // Assert
    expect(result).toEqual({ name: 'Gmail', url: 'https://mail.google.com' })
  })

  it('should detect Outlook when given an outlook.com address', () => {
    // Arrange & Act
    const result = detectEmailProvider('user@outlook.com')

    // Assert
    expect(result).toEqual({ name: 'Outlook', url: 'https://outlook.live.com/mail' })
  })

  it('should detect Outlook when given a hotmail.com address', () => {
    // Arrange & Act
    const result = detectEmailProvider('user@hotmail.com')

    // Assert
    expect(result).toEqual({ name: 'Outlook', url: 'https://outlook.live.com/mail' })
  })

  it('should detect Yahoo Mail when given a yahoo.com address', () => {
    // Arrange & Act
    const result = detectEmailProvider('user@yahoo.com')

    // Assert
    expect(result).toEqual({ name: 'Yahoo Mail', url: 'https://mail.yahoo.com' })
  })

  it('should detect iCloud Mail when given an icloud.com address', () => {
    // Arrange & Act
    const result = detectEmailProvider('user@icloud.com')

    // Assert
    expect(result).toEqual({ name: 'iCloud Mail', url: 'https://www.icloud.com/mail' })
  })

  it('should detect ProtonMail when given a protonmail.com address', () => {
    // Arrange & Act
    const result = detectEmailProvider('user@protonmail.com')

    // Assert
    expect(result).toEqual({ name: 'ProtonMail', url: 'https://mail.proton.me' })
  })

  it('should detect ProtonMail when given a proton.me address', () => {
    // Arrange & Act
    const result = detectEmailProvider('user@proton.me')

    // Assert
    expect(result).toEqual({ name: 'ProtonMail', url: 'https://mail.proton.me' })
  })

  it('should return null when given an unknown domain', () => {
    // Arrange & Act & Assert
    expect(detectEmailProvider('user@custom-domain.org')).toBeNull()
  })

  it('should return null when given an email without @', () => {
    // Arrange & Act & Assert
    expect(detectEmailProvider('no-at-sign')).toBeNull()
  })

  it('should return null when given an empty string', () => {
    // Arrange & Act & Assert
    expect(detectEmailProvider('')).toBeNull()
  })

  it('should be case-insensitive for domain matching', () => {
    // Arrange & Act
    const result = detectEmailProvider('user@GMAIL.COM')

    // Assert
    expect(result).toEqual({ name: 'Gmail', url: 'https://mail.google.com' })
  })
})
