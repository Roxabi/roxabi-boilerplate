import { ErrorCode } from '../../common/errorCodes.js'

export class FlagKeyInvalidException extends Error {
  static readonly errorCode = ErrorCode.FEATURE_FLAG_KEY_INVALID
  readonly errorCode = FlagKeyInvalidException.errorCode

  constructor(key: string) {
    super(
      `Invalid feature flag key "${key}". Must match /^[a-z0-9][a-z0-9_-]*$/ and be at most 100 characters`
    )
    this.name = 'FlagKeyInvalidException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
