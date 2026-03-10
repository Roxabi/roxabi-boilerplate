import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/appName', () => ({ appName: 'TestApp' }))

vi.mock('@/paraglide/messages', () => ({
  m: {
    footer_copyright: ({ year, appName }: { year: string; appName: string }) =>
      `Copyright ${year} ${appName}`,
    github_label: () => 'GitHub',
    footer_legal_notice: () => 'Legal Notice',
    footer_terms: () => 'Terms',
    footer_privacy: () => 'Privacy',
    footer_cookies: () => 'Cookies',
    footer_cookie_settings: () => 'Cookie Settings',
  },
}))

vi.mock('@repo/ui', () => ({
  Separator: ({ orientation, className }: { orientation?: string; className?: string }) => (
    <div data-testid="separator" data-orientation={orientation} className={className} />
  ),
}))

vi.mock('@/lib/config', () => ({
  GITHUB_REPO_URL: 'https://github.com/test/repo',
}))

vi.mock('@/lib/consent/useConsent', () => ({
  useConsent: () => ({
    openSettings: vi.fn(),
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string
    params?: Record<string, string>
    children: ReactNode
    [key: string]: unknown
  }) => {
    let href = to
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`$${key === '_splat' ? '' : key}`, value)
      }
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

import { Footer } from './Footer'

describe('Footer', () => {
  it('should render the footer element', () => {
    // Arrange & Act
    render(<Footer />)

    // Assert
    const footer = screen.getByRole('contentinfo')
    expect(footer).toBeInTheDocument()
  })

  it('should display the copyright text with current year', () => {
    // Arrange
    const year = new Date().getFullYear().toString()

    // Act
    render(<Footer />)

    // Assert
    expect(screen.getByText(`Copyright ${year} TestApp`)).toBeInTheDocument()
  })

  it('should render the GitHub link', () => {
    // Arrange & Act
    render(<Footer />)

    // Assert
    const link = screen.getByRole('link', { name: 'GitHub' })
    expect(link).toHaveAttribute('href', 'https://github.com/test/repo')
  })

  it('should open the GitHub link in a new tab', () => {
    // Arrange & Act
    render(<Footer />)

    // Assert
    const link = screen.getByRole('link', { name: 'GitHub' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should render legal navigation links', () => {
    // Arrange & Act
    render(<Footer />)

    // Assert
    expect(screen.getByRole('link', { name: 'Legal Notice' })).toHaveAttribute(
      'href',
      '/legal/mentions-legales'
    )
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/legal/cgu')
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/legal/confidentialite'
    )
    expect(screen.getByRole('link', { name: 'Cookies' })).toHaveAttribute('href', '/legal/cookies')
  })

  it('should render the cookie settings button', () => {
    // Arrange & Act
    render(<Footer />)

    // Assert
    const button = screen.getByRole('button', { name: 'Cookie Settings' })
    expect(button).toBeInTheDocument()
  })

  it('should render a legal navigation landmark', () => {
    // Arrange & Act
    render(<Footer />)

    // Assert
    const nav = screen.getByRole('navigation', { name: 'Legal' })
    expect(nav).toBeInTheDocument()
  })
})
