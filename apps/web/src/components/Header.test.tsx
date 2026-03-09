import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockParaglideMessages } from '@/test/__mocks__/mockMessages'

const mockClientEnv = vi.hoisted(() => ({
  VITE_TALKS_URL: undefined as string | undefined,
  VITE_GITHUB_REPO_URL: undefined as string | undefined,
}))

vi.mock('@repo/ui', () => ({
  Button: ({
    children,
    asChild,
    onClick,
    disabled,
    ...props
  }: React.PropsWithChildren<{
    asChild?: boolean
    onClick?: () => void
    disabled?: boolean
    [key: string]: unknown
  }>) =>
    asChild ? (
      children
    ) : (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={props['aria-label'] as string}
        className={props.className as string}
      >
        {children}
      </button>
    ),
  DropdownMenu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: React.PropsWithChildren<{ asChild?: boolean }>) =>
    asChild ? children : <div>{children}</div>,
  DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...props
  }: {
    to: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

mockParaglideMessages()

vi.mock('@/lib/authClient', () => ({
  useSession: () => ({ data: null }),
  authClient: {
    useActiveOrganization: () => ({ data: null }),
    useListOrganizations: () => ({ data: null }),
    organization: { setActive: vi.fn(), create: vi.fn() },
  },
}))

vi.mock('./UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}))

vi.mock('./OrgSwitcher', () => ({
  OrgSwitcher: () => <div data-testid="org-switcher" />,
}))

vi.mock('@/lib/useOrganizations', () => ({
  useOrganizations: () => ({ data: undefined, isLoading: true, error: null, refetch: vi.fn() }),
}))

vi.mock('@/lib/config', () => ({
  GITHUB_REPO_URL: 'https://github.com/test/repo',
}))

vi.mock('@/lib/env.shared', () => ({
  clientEnv: mockClientEnv,
}))

vi.mock('@/paraglide/runtime', () => ({
  getLocale: () => 'en',
  setLocale: vi.fn(),
  locales: ['en', 'fr'],
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}))

import { Header } from './Header'

describe('Header', () => {
  it('should render the Roxabi logo', () => {
    // Arrange & Act
    render(<Header />)

    // Assert
    expect(screen.getByText('Roxabi')).toBeInTheDocument()
  })

  it('should render navigation links', () => {
    // Arrange & Act
    render(<Header />)

    // Assert
    expect(screen.getAllByText('nav_home').length).toBeGreaterThanOrEqual(1)
  })

  it('should render the mobile menu toggle button', () => {
    // Arrange & Act
    render(<Header />)

    // Assert
    const menuButton = screen.getByLabelText('menu_open')
    expect(menuButton).toBeInTheDocument()
  })

  it('should toggle mobile menu when clicking the menu button', () => {
    // Arrange
    render(<Header />)
    const menuButton = screen.getByLabelText('menu_open')

    // Act
    fireEvent.click(menuButton)

    // Assert
    expect(screen.getByLabelText('menu_close')).toBeInTheDocument()
  })

  it('should link the logo to the home page', () => {
    // Arrange & Act
    render(<Header />)

    // Assert
    const logoLink = screen.getByRole('link', { name: 'Roxabi' })
    expect(logoLink).toHaveAttribute('href', '/')
  })

  it('should render the Design System link in desktop nav', () => {
    // Arrange & Act
    render(<Header />)

    // Assert
    const links = screen.getAllByText('nav_design_system')
    expect(links.length).toBeGreaterThanOrEqual(1)

    const desktopLink = links[0]?.closest('a')
    expect(desktopLink).toHaveAttribute('href', '/design-system')
  })

  it('should render the Design System link in mobile nav when open', () => {
    // Arrange
    render(<Header />)
    const menuButton = screen.getByLabelText('menu_open')

    // Act
    fireEvent.click(menuButton)

    // Assert
    const links = screen.getAllByText('nav_design_system')
    expect(links.length).toBeGreaterThanOrEqual(2)
  })

  it('should close mobile menu when Escape key is pressed', () => {
    // Arrange
    render(<Header />)
    fireEvent.click(screen.getByLabelText('menu_open'))
    expect(screen.getByLabelText('menu_close')).toBeInTheDocument()

    // Act
    fireEvent.keyDown(document, { key: 'Escape' })

    // Assert
    expect(screen.getByLabelText('menu_open')).toBeInTheDocument()
  })

  it('should close mobile menu when clicking outside', () => {
    // Arrange
    render(<Header />)
    fireEvent.click(screen.getByLabelText('menu_open'))
    expect(screen.getByLabelText('menu_close')).toBeInTheDocument()

    // Act
    fireEvent.click(document.body)

    // Assert
    expect(screen.getByLabelText('menu_open')).toBeInTheDocument()
  })
})

describe('Header — Talks link (VITE_TALKS_URL)', () => {
  beforeEach(() => {
    mockClientEnv.VITE_TALKS_URL = undefined
  })

  afterEach(() => {
    mockClientEnv.VITE_TALKS_URL = undefined
  })

  it('should NOT render the Talks link when VITE_TALKS_URL is undefined', () => {
    // Arrange
    mockClientEnv.VITE_TALKS_URL = undefined

    // Act
    render(<Header />)

    // Assert
    expect(screen.queryByText('nav_talks')).not.toBeInTheDocument()
  })

  it('should render the Talks link in desktop nav when VITE_TALKS_URL is set', () => {
    // Arrange
    mockClientEnv.VITE_TALKS_URL = 'https://talks.example.com'

    // Act
    render(<Header />)

    // Assert
    const links = screen.getAllByText('nav_talks')
    expect(links.length).toBeGreaterThanOrEqual(1)
    const desktopLink = links[0]?.closest('a')
    expect(desktopLink).toHaveAttribute('href', 'https://talks.example.com')
    expect(desktopLink).toHaveAttribute('target', '_blank')
    expect(desktopLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should render the Talks link in mobile nav when VITE_TALKS_URL is set and menu is open', () => {
    // Arrange
    mockClientEnv.VITE_TALKS_URL = 'https://talks.example.com'
    render(<Header />)
    const menuButton = screen.getByLabelText('menu_open')

    // Act
    fireEvent.click(menuButton)

    // Assert
    const links = screen.getAllByText('nav_talks')
    expect(links.length).toBeGreaterThanOrEqual(2)
  })
})
