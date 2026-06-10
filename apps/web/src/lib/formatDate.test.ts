import { describe, expect, it } from 'vitest'
import { formatDate, formatTimestamp } from './formatDate'

describe('formatDate', () => {
  it('returns em-dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('returns em-dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('returns em-dash for empty string', () => {
    expect(formatDate('')).toBe('—')
  })

  it('formats a Date object to a short date string', () => {
    // Use a fixed UTC date to avoid locale variance on numeric parts
    const d = new Date('2024-01-15T00:00:00.000Z')
    const result = formatDate(d)
    // Must contain the year
    expect(result).toContain('2024')
    // Must contain the day number
    expect(result).toMatch(/1[45]/)
  })

  it('formats a date string to a short date string', () => {
    const result = formatDate('2024-06-01T00:00:00.000Z')
    expect(result).toContain('2024')
  })

  it('accepts a Date instance directly', () => {
    const d = new Date(2023, 11, 31) // Dec 31 2023
    const result = formatDate(d)
    expect(result).toContain('2023')
  })
})

describe('formatTimestamp', () => {
  it('returns em-dash for null', () => {
    expect(formatTimestamp(null)).toBe('—')
  })

  it('returns em-dash for undefined', () => {
    expect(formatTimestamp(undefined)).toBe('—')
  })

  it('returns em-dash for empty string', () => {
    expect(formatTimestamp('')).toBe('—')
  })

  it('formats a date string to include year, month, day and time parts', () => {
    const result = formatTimestamp('2024-03-20T14:30:00.000Z')
    expect(result).toContain('2024')
    // Locale-neutral: result must be longer than a plain date (has time info)
    expect(result.length).toBeGreaterThan(12)
  })

  it('formats a Date object to include time information', () => {
    const d = new Date('2024-07-04T09:00:00.000Z')
    const result = formatTimestamp(d)
    expect(result).toContain('2024')
    expect(result.length).toBeGreaterThan(12)
  })
})
