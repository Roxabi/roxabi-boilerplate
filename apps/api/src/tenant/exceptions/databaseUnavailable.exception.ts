import { ErrorCode } from '../../common/errorCodes.js'

export class DatabaseUnavailableException extends Error {
  static readonly errorCode = ErrorCode.DATABASE_UNAVAILABLE
  readonly errorCode = DatabaseUnavailableException.errorCode

  constructor() {
    super('Database not available')
    this.name = 'DatabaseUnavailableException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
