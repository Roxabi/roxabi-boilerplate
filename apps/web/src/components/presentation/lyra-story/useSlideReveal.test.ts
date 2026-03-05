import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Controllable mocks for @repo/ui
// ---------------------------------------------------------------------------

const mockInView = vi.fn(() => false)
const mockRef = vi.fn()
const mockReducedMotion = vi.fn(() => false)

vi.mock('@repo/ui', () => ({
  useInView: vi.fn((_opts: { threshold?: number; triggerOnce?: boolean }) => ({
    ref: mockRef,
    inView: mockInView(),
  })),
  useReducedMotion: vi.fn(() => mockReducedMotion()),
}))

import { useInView } from '@repo/ui'
import { useSlideReveal } from './useSlideReveal'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  mockInView.mockReset()
  mockInView.mockReturnValue(false)
  mockReducedMotion.mockReset()
  mockReducedMotion.mockReturnValue(false)
  vi.clearAllMocks()
})

describe('useSlideReveal', () => {
  it('should return visible = true when inView is true and reducedMotion is false', () => {
    // Arrange
    mockInView.mockReturnValue(true)
    mockReducedMotion.mockReturnValue(false)

    // Act
    const { result } = renderHook(() => useSlideReveal())

    // Assert
    expect(result.current.visible).toBe(true)
  })

  it('should return visible = true when reducedMotion is true regardless of inView', () => {
    // Arrange
    mockInView.mockReturnValue(false)
    mockReducedMotion.mockReturnValue(true)

    // Act
    const { result } = renderHook(() => useSlideReveal())

    // Assert
    expect(result.current.visible).toBe(true)
  })

  it('should return visible = false when both inView and reducedMotion are false', () => {
    // Arrange
    mockInView.mockReturnValue(false)
    mockReducedMotion.mockReturnValue(false)

    // Act
    const { result } = renderHook(() => useSlideReveal())

    // Assert
    expect(result.current.visible).toBe(false)
  })

  it('should forward default threshold of 0.3 to useInView', () => {
    // Arrange & Act
    renderHook(() => useSlideReveal())

    // Assert
    expect(useInView).toHaveBeenCalledWith(expect.objectContaining({ threshold: 0.3 }))
  })

  it('should forward custom threshold to useInView', () => {
    // Arrange & Act
    renderHook(() => useSlideReveal({ threshold: 0.7 }))

    // Assert
    expect(useInView).toHaveBeenCalledWith(expect.objectContaining({ threshold: 0.7 }))
  })

  it('should return the reducedMotion value', () => {
    // Arrange
    mockReducedMotion.mockReturnValue(true)

    // Act
    const { result } = renderHook(() => useSlideReveal())

    // Assert
    expect(result.current.reducedMotion).toBe(true)
  })

  it('should return the ref from useInView', () => {
    // Arrange & Act
    const { result } = renderHook(() => useSlideReveal())

    // Assert
    expect(result.current.ref).toBe(mockRef)
  })
})
