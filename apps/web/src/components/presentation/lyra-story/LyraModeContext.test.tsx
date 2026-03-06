import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @tanstack/react-router — useSearch is the only dependency
// ---------------------------------------------------------------------------

const mockUseSearch = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useSearch: () => mockUseSearch(),
}))

import { LyraModeProvider, useLyraMode } from './LyraModeContext'

// ---------------------------------------------------------------------------
// Test consumer — renders context values into the DOM for assertion
// ---------------------------------------------------------------------------

function ModeConsumer() {
  const { mode, isRpg } = useLyraMode()
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="is-rpg">{String(isRpg)}</span>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <LyraModeProvider>
      <ModeConsumer />
    </LyraModeProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  mockUseSearch.mockReset()
})

describe('LyraModeProvider / useLyraMode', () => {
  it('should default to mode "story" and isRpg = false when search returns empty object', () => {
    // Arrange
    mockUseSearch.mockReturnValue({})

    // Act
    renderWithProvider()

    // Assert
    expect(screen.getByTestId('mode')).toHaveTextContent('story')
    expect(screen.getByTestId('is-rpg')).toHaveTextContent('false')
  })

  it('should set isRpg = true when mode is "mmorpg"', () => {
    // Arrange
    mockUseSearch.mockReturnValue({ mode: 'mmorpg' })

    // Act
    renderWithProvider()

    // Assert
    expect(screen.getByTestId('mode')).toHaveTextContent('mmorpg')
    expect(screen.getByTestId('is-rpg')).toHaveTextContent('true')
  })

  it('should set isRpg = false when mode is "story"', () => {
    // Arrange
    mockUseSearch.mockReturnValue({ mode: 'story' })

    // Act
    renderWithProvider()

    // Assert
    expect(screen.getByTestId('mode')).toHaveTextContent('story')
    expect(screen.getByTestId('is-rpg')).toHaveTextContent('false')
  })
})
