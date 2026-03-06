import { describe, expect, it } from 'vitest'
import { computeCompanionStage } from './companionStage'

describe('computeCompanionStage', () => {
  const AWAKENING = 14 // index in sectionIds

  it('returns index directly before awakening divider', () => {
    expect(computeCompanionStage(0, AWAKENING)).toBe(0)
    expect(computeCompanionStage(13, AWAKENING)).toBe(13)
  })

  it('clamps at AWAKENING_IDX - 1 when index equals awakening', () => {
    expect(computeCompanionStage(AWAKENING, AWAKENING)).toBe(AWAKENING - 1)
  })

  it('decrements by 1 for sections after awakening', () => {
    expect(computeCompanionStage(15, AWAKENING)).toBe(14)
    expect(computeCompanionStage(17, AWAKENING)).toBe(16)
  })

  it('handles edge case: index 0 with awakening at 0', () => {
    // awakeningIdx - 1 = -1, so Math.min(0, -1) = -1 (no stages before divider at 0)
    expect(computeCompanionStage(0, 0)).toBe(-1)
  })
})
