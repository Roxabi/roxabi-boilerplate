import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockClientEnv = vi.hoisted(() => ({
  VITE_DOCS_URL: undefined as string | undefined,
}))

vi.mock('@repo/ui', () => ({
  Button: ({ children, asChild }: React.PropsWithChildren<{ asChild?: boolean; size?: string }>) =>
    asChild ? children : <button type="button">{children}</button>,
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/paraglide/messages', () => ({
  m: {
    cta_title: () => 'Ready to Start?',
    cta_subtitle: () => 'Get started building your SaaS today',
    cta_button: () => 'Get Started',
  },
}))

vi.mock('@/lib/env.shared', () => ({
  clientEnv: mockClientEnv,
}))

import { CtaSection } from './CtaSection'

describe('CtaSection', () => {
  afterEach(() => {
    mockClientEnv.VITE_DOCS_URL = undefined
  })

  it('should render the section heading', () => {
    render(<CtaSection />)
    expect(screen.getByText('Ready to Start?')).toBeInTheDocument()
  })

  it('should render the subtitle', () => {
    render(<CtaSection />)
    expect(screen.getByText('Get started building your SaaS today')).toBeInTheDocument()
  })

  it('should not render the CTA button when VITE_DOCS_URL is unset', () => {
    render(<CtaSection />)
    expect(screen.queryByText('Get Started')).not.toBeInTheDocument()
  })

  it('should render the CTA button linking to docs URL when VITE_DOCS_URL is set', () => {
    mockClientEnv.VITE_DOCS_URL = 'https://docs.app.roxabi.com'
    render(<CtaSection />)
    const link = screen.getByRole('link', { name: 'Get Started' })
    expect(link).toHaveAttribute('href', 'https://docs.app.roxabi.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
