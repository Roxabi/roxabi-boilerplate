import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mockParaglideMessages } from '@/test/__mocks__/mockMessages'

vi.mock('@repo/ui', async () => await import('@/test/__mocks__/repoUi'))

mockParaglideMessages()

vi.mock('@/paraglide/runtime', () => ({
  getLocale: () => 'en',
  locales: ['en', 'fr'],
  setLocale: vi.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver (passive -- no callback needed for page render tests)
import { setupIntersectionObserverMock } from '@/test/mocks/intersectionObserver'

setupIntersectionObserverMock('passive')

// Mock requestAnimationFrame
vi.stubGlobal(
  'requestAnimationFrame',
  vi.fn((cb: FrameRequestCallback) => {
    cb(performance.now())
    return 1
  })
)
vi.stubGlobal('cancelAnimationFrame', vi.fn())

// Mock TanStack Router hooks used by the page component
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  createLazyFileRoute: () => () => ({}),
  useNavigate: () => vi.fn(),
  Link: ({ children }: React.PropsWithChildren) => children,
}))

// Import the page component
import { ClaudeCodePresentation } from './claude-code.lazy'

describe('ClaudeCodePresentation page', () => {
  it('should render all sections with correct ids when page loads', () => {
    // Arrange
    const expectedSectionIds = [
      'intro',
      'building-blocks',
      'specialization',
      'dev-process',
      'toolchain',
      'agent-teams',
      'end-to-end',
      'lessons',
      'closing',
    ]

    // Act
    render(<ClaudeCodePresentation />)

    // Assert -- each section id should be present in the document.
    // Using document.getElementById because SectionContainer renders plain
    // divs with id attributes, not semantic region elements with accessible names.
    for (const sectionId of expectedSectionIds) {
      const section = document.getElementById(sectionId)
      expect(section, `Section with id "${sectionId}" should exist`).toBeInTheDocument()
    }
  })

  it('should render key section headings when page loads', () => {
    // Arrange & Act
    render(<ClaudeCodePresentation />)

    // Assert
    expect(screen.getByRole('heading', { name: /talk_intro_title/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /talk_blocks_title/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /talk_spec_title/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /talk_toolchain_title/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /talk_teams_title/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /talk_e2e_title/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /talk_lessons_title/i })).toBeInTheDocument()
  })
})
