import { describe, expect, it } from 'vitest'

import { FeatureFlagCreateFailedException } from './featureFlagCreateFailed.exception.js'

describe('FeatureFlagCreateFailedException', () => {
  it('should set message', () => {
    const exception = new FeatureFlagCreateFailedException()

    expect(exception.message).toBe('Failed to create feature flag')
  })

  it('should set name to FeatureFlagCreateFailedException', () => {
    const exception = new FeatureFlagCreateFailedException()

    expect(exception.name).toBe('FeatureFlagCreateFailedException')
  })

  it('should extend Error and pass instanceof check', () => {
    const exception = new FeatureFlagCreateFailedException()

    expect(exception).toBeInstanceOf(Error)
    expect(exception).toBeInstanceOf(FeatureFlagCreateFailedException)
  })

  it('should have errorCode property set to FEATURE_FLAG_CREATE_FAILED', () => {
    const exception = new FeatureFlagCreateFailedException()

    expect(exception.errorCode).toBe('FEATURE_FLAG_CREATE_FAILED')
  })

  it('should have static errorCode matching instance errorCode', () => {
    expect(FeatureFlagCreateFailedException.errorCode).toBe('FEATURE_FLAG_CREATE_FAILED')
    const exception = new FeatureFlagCreateFailedException()
    expect(exception.errorCode).toBe(FeatureFlagCreateFailedException.errorCode)
  })
})
