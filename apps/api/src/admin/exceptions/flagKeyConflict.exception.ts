import { ErrorCode } from '../../common/errorCodes.js'

export class FlagKeyConflictException extends Error {
  static readonly errorCode = ErrorCode.FEATURE_FLAG_KEY_CONFLICT
  readonly errorCode = FlagKeyConflictException.errorCode

  constructor(key: string) {
    super(`Feature flag with key "${key}" already exists`)
    this.name = 'FlagKeyConflictException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
