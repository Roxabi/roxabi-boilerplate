import { describe, expect, it } from 'vitest'
import { searchSchema } from './lyra-story'

describe('lyra-story searchSchema', () => {
  it('accepts valid avatar values', () => {
    const result = searchSchema.safeParse({ avatar: 'quantum' })
    expect(result.success).toBe(true)
  })

  it('accepts valid avatarSize values from the allowlist', () => {
    for (const size of [48, 80, 200, 400]) {
      expect(searchSchema.safeParse({ avatarSize: size }).success).toBe(true)
    }
  })

  it('falls back to 400 on avatarSize not in allowlist', () => {
    for (const invalid of [999, 0, -1]) {
      const result = searchSchema.safeParse({ avatarSize: invalid })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.avatarSize).toBe(400)
    }
  })

  it('coerces string avatarSize to number, falls back to 400 if not in allowlist', () => {
    expect(searchSchema.safeParse({ avatarSize: '80' }).success).toBe(true)
    const result = searchSchema.safeParse({ avatarSize: '81' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.avatarSize).toBe(400)
  })

  it('accepts valid avatarPos values', () => {
    expect(searchSchema.safeParse({ avatarPos: 'bottom-right' }).success).toBe(true)
    expect(searchSchema.safeParse({ avatarPos: 'invalid' }).success).toBe(false)
  })

  it('uses defaults when fields are omitted', () => {
    const result = searchSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.avatar).toBe('constellation')
      expect(result.data.avatarSize).toBe(400)
      expect(result.data.avatarPos).toBe('bottom-left')
      expect(result.data.mode).toBe('story')
    }
  })
})
