import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockClientEnv = vi.hoisted(() => ({
  VITE_DOCS_URL: undefined as string | undefined,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}))

vi.mock('@repo/ui', () => ({
  Card: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardTitle: ({ children }: React.PropsWithChildren) => <h3>{children}</h3>,
  CardContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/paraglide/messages', () => ({
  m: {
    features_title: () => 'Features',
    features_subtitle: () => 'Everything you need',
    feature_fullstack_title: () => 'Full Stack',
    feature_fullstack_desc: () => 'Full stack framework',
    feature_auth_title: () => 'Authentication',
    feature_auth_desc: () => 'Built-in auth',
    feature_multitenant_title: () => 'Multi-tenant',
    feature_multitenant_desc: () => 'Multi-tenant support',
    feature_rbac_title: () => 'RBAC',
    feature_rbac_desc: () => 'Role-based access',
    feature_typesafe_title: () => 'Type-safe',
    feature_typesafe_desc: () => 'End-to-end type safety',
    feature_monorepo_title: () => 'Monorepo',
    feature_monorepo_desc: () => 'Monorepo structure',
    feature_i18n_title: () => 'i18n',
    feature_i18n_desc: () => 'Internationalization',
    feature_ai_title: () => 'AI',
    feature_ai_desc: () => 'AI integration',
  },
}))

vi.mock('@/lib/env.shared', () => ({
  clientEnv: mockClientEnv,
}))

import { FeaturesSection } from './FeaturesSection'

describe('FeaturesSection', () => {
  it('should render the section heading', () => {
    // Arrange & Act
    render(<FeaturesSection />)

    // Assert
    expect(screen.getByText('Features')).toBeInTheDocument()
  })

  it('should render the subtitle', () => {
    // Arrange & Act
    render(<FeaturesSection />)

    // Assert
    expect(screen.getByText('Everything you need')).toBeInTheDocument()
  })

  it('should render all eight feature cards', () => {
    // Arrange & Act
    render(<FeaturesSection />)

    // Assert
    expect(screen.getByText('Full Stack')).toBeInTheDocument()
    expect(screen.getByText('Authentication')).toBeInTheDocument()
    expect(screen.getByText('Multi-tenant')).toBeInTheDocument()
    expect(screen.getByText('RBAC')).toBeInTheDocument()
    expect(screen.getByText('Type-safe')).toBeInTheDocument()
    expect(screen.getByText('Monorepo')).toBeInTheDocument()
    expect(screen.getByText('i18n')).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
  })

  it('should render feature descriptions', () => {
    // Arrange & Act
    render(<FeaturesSection />)

    // Assert
    expect(screen.getByText('Full stack framework')).toBeInTheDocument()
    expect(screen.getByText('Built-in auth')).toBeInTheDocument()
    expect(screen.getByText('AI integration')).toBeInTheDocument()
  })

  it('should render within a section element', () => {
    // Arrange & Act
    const { container } = render(<FeaturesSection />)

    // Assert
    const section = container.querySelector('section')
    expect(section).toBeInTheDocument()
  })
})

describe('FeaturesSection — docs links (VITE_DOCS_URL)', () => {
  afterEach(() => {
    mockClientEnv.VITE_DOCS_URL = undefined
  })

  it('should render feature cards with docs hrefs WITHOUT anchor wrapper when VITE_DOCS_URL is undefined', () => {
    // Arrange
    mockClientEnv.VITE_DOCS_URL = undefined

    // Act
    const { container } = render(<FeaturesSection />)

    // Assert — no external anchor links should be rendered
    const externalLinks = container.querySelectorAll('a[target="_blank"]')
    expect(externalLinks).toHaveLength(0)
  })

  it('should render feature cards with docs hrefs as anchor links when VITE_DOCS_URL is set', () => {
    // Arrange
    const docsBase = 'https://docs.app.roxabi.com'
    mockClientEnv.VITE_DOCS_URL = docsBase

    // Act
    const { container } = render(<FeaturesSection />)

    // Assert — features with href should be wrapped in <a>
    const externalLinks = container.querySelectorAll('a[target="_blank"]')
    expect(externalLinks.length).toBeGreaterThan(0)

    const fullStackLink = Array.from(externalLinks).find(
      (el) => el.getAttribute('href') === `${docsBase}/docs/architecture/overview`
    )
    expect(fullStackLink).toBeDefined()
    expect(fullStackLink).toHaveAttribute('rel', 'noopener noreferrer')

    const authLink = Array.from(externalLinks).find(
      (el) => el.getAttribute('href') === `${docsBase}/docs/guides/authentication`
    )
    expect(authLink).toBeDefined()
    expect(authLink).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
