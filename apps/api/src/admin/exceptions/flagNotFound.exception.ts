import { ErrorCode } from '../../common/errorCodes.js'

export class FlagNotFoundException extends Error {
  static readonly errorCode = ErrorCode.FEATURE_FLAG_NOT_FOUND
  readonly errorCode = FlagNotFoundException.errorCode

  constructor(id: string) {
    super(`Feature flag "${id}" not found`)
    this.name = 'FlagNotFoundException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
