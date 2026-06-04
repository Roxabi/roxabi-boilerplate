import { ErrorCode } from '../../common/errorCodes.js'

export class FeatureFlagCreateFailedException extends Error {
  static readonly errorCode = ErrorCode.FEATURE_FLAG_CREATE_FAILED
  readonly errorCode = FeatureFlagCreateFailedException.errorCode

  constructor() {
    super('Failed to create feature flag')
    this.name = 'FeatureFlagCreateFailedException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
