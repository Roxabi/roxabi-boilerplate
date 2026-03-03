import { describe, expect, it } from 'vitest'

import { RoleInsertFailedException } from './roleInsertFailed.exception.js'

describe('RoleInsertFailedException', () => {
  it('should set message', () => {
    const exception = new RoleInsertFailedException()

    expect(exception.message).toBe('Failed to insert role')
  })

  it('should set name to RoleInsertFailedException', () => {
    const exception = new RoleInsertFailedException()

    expect(exception.name).toBe('RoleInsertFailedException')
  })

  it('should extend Error and pass instanceof check', () => {
    const exception = new RoleInsertFailedException()

    expect(exception).toBeInstanceOf(Error)
    expect(exception).toBeInstanceOf(RoleInsertFailedException)
  })

  it('should have errorCode property set to ROLE_INSERT_FAILED', () => {
    const exception = new RoleInsertFailedException()

    expect(exception.errorCode).toBe('ROLE_INSERT_FAILED')
  })

  it('should have static errorCode matching instance errorCode', () => {
    expect(RoleInsertFailedException.errorCode).toBe('ROLE_INSERT_FAILED')
    const exception = new RoleInsertFailedException()
    expect(exception.errorCode).toBe(RoleInsertFailedException.errorCode)
  })
})
