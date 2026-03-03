import { ErrorCode } from '../errorCodes.js'

export class InvalidCursorError extends Error {
  static readonly errorCode = ErrorCode.INVALID_CURSOR
  readonly errorCode = InvalidCursorError.errorCode

  constructor(message = 'Invalid cursor token') {
    super(message)
    this.name = 'InvalidCursorError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
