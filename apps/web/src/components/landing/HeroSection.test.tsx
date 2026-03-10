import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockClientEnv = vi.hoisted(() => ({
  VITE_DOCS_URL: undefined as string | undefined,
}))

vi.mock('@/paraglide/messages', () => ({
  m: {
    hero_badge: () => 'Open Source',
    hero_title: () => 'Build Your SaaS Faster',
    hero_subtitle: () => 'A modern SaaS boilerplate',
    hero_cta_start: () => 'Get Started',
    hero_cta_github: () => 'View on GitHub',
    stat_setup: () => '5 min',
    stat_setup_label: () => 'Setup time',
    stat_config: () => 'Zero',
    stat_config_label: () => 'Config needed',
    stat_production: () => '100%',
    stat_production_label: () => 'Production ready',
  },
}))

vi.mock('@/lib/config', () => ({
  GITHUB_REPO_URL: 'https://github.com/test/repo',
}))

vi.mock('@/lib/env.shared', () => ({
  clientEnv: mockClientEnv,
}))

import { HeroSection } from './HeroSection'

describe('HeroSection', () => {
  it('should render the hero title', () => {
    // Arrange & Act
    render(<HeroSection />)

    // Assert
    expect(screen.getByText('Build Your SaaS Faster')).toBeInTheDocument()
  })

  it('should render the hero subtitle', () => {
    // Arrange & Act
    render(<HeroSection />)

    // Assert
    expect(screen.getByText('A modern SaaS boilerplate')).toBeInTheDocument()
  })

  it('should render the badge', () => {
    // Arrange & Act
    render(<HeroSection />)

    // Assert
    expect(screen.getByText('Open Source')).toBeInTheDocument()
  })

  it('should render CTA buttons', () => {
    // Arrange & Act
    render(<HeroSection />)

    // Assert
    expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view on github/i })).toBeInTheDocument()
  })

  it('should render GitHub link with correct href and rel attributes', () => {
    // Arrange & Act
    render(<HeroSection />)

    // Assert
    const githubLink = screen.getByRole('link', { name: /view on github/i })
    expect(githubLink).toHaveAttribute('href', 'https://github.com/test/repo')
    expect(githubLink).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(githubLink).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
    expect(githubLink).toHaveAttribute('target', '_blank')
  })

  it('should render stats', () => {
    // Arrange & Act
    render(<HeroSection />)

    // Assert
    expect(screen.getByText('5 min')).toBeInTheDocument()
    expect(screen.getByText('Setup time')).toBeInTheDocument()
    expect(screen.getByText('Zero')).toBeInTheDocument()
    expect(screen.getByText('Config needed')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('Production ready')).toBeInTheDocument()
  })
})

describe('HeroSection — CTA link (VITE_DOCS_URL)', () => {
  afterEach(() => {
    mockClientEnv.VITE_DOCS_URL = undefined
  })

  it('should render CTA link with href="#" when VITE_DOCS_URL is undefined', () => {
    // Arrange
    mockClientEnv.VITE_DOCS_URL = undefined

    // Act
    render(<HeroSection />)

    // Assert
    const ctaLink = screen.getByRole('link', { name: /get started/i })
    expect(ctaLink).toHaveAttribute('href', '#')
  })

  it('should render CTA link with correct URL when VITE_DOCS_URL is set', () => {
    // Arrange
    mockClientEnv.VITE_DOCS_URL = 'https://docs.example.com'

    // Act
    render(<HeroSection />)

    // Assert
    const ctaLink = screen.getByRole('link', { name: /get started/i })
    expect(ctaLink).toHaveAttribute('href', 'https://docs.example.com')
    expect(ctaLink).toHaveAttribute('target', '_blank')
    expect(ctaLink).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
