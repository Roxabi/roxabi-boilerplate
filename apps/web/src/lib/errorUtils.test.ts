import { describe, expect, it } from 'vitest'
import { ApiError } from './apiClient'
import { apiErrorToMessage, isErrorWithMessage, parseErrorMessage } from './errorUtils'

describe('isErrorWithMessage', () => {
  it('should return true for object with string message', () => {
    expect(isErrorWithMessage({ message: 'hello' })).toBe(true)
  })

  it('should return false for null', () => {
    expect(isErrorWithMessage(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isErrorWithMessage(undefined)).toBe(false)
  })

  it('should return false for non-object', () => {
    expect(isErrorWithMessage('string')).toBe(false)
  })

  it('should return false for object without message', () => {
    expect(isErrorWithMessage({ name: 'err' })).toBe(false)
  })

  it('should return false for object with non-string message', () => {
    expect(isErrorWithMessage({ message: 42 })).toBe(false)
  })
})

describe('parseErrorMessage', () => {
  it('should return message from valid error object', () => {
    expect(parseErrorMessage({ message: 'oops' }, 'fallback')).toBe('oops')
  })

  it('should return fallback for invalid data', () => {
    expect(parseErrorMessage(null, 'fallback')).toBe('fallback')
  })
})

describe('apiErrorToMessage', () => {
  it('returns the server message when the ApiError body carries one', () => {
    const err = new ApiError(400, 'Server says no', { message: 'Server says no' })

    expect(apiErrorToMessage(err, 'fallback')).toBe('Server says no')
  })

  it('uses the per-status copy when the body has no message', () => {
    const err = new ApiError(409, 'HTTP 409', null)

    expect(apiErrorToMessage(err, 'fallback', { 409: 'Email already exists' })).toBe(
      'Email already exists'
    )
  })

  it('falls back when neither body message nor status copy applies', () => {
    const err = new ApiError(500, 'HTTP 500', 'not-json')

    expect(apiErrorToMessage(err, 'fallback')).toBe('fallback')
  })

  it('returns the message of a plain Error', () => {
    expect(apiErrorToMessage(new Error('boom'), 'fallback')).toBe('boom')
  })

  it('returns the fallback for non-Error values', () => {
    expect(apiErrorToMessage('weird', 'fallback')).toBe('fallback')
  })
})
