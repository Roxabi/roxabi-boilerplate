import { ErrorCode } from '../../common/errorCodes.js'

export class ApiKeyExpiryInPastException extends Error {
  static readonly errorCode = ErrorCode.API_KEY_EXPIRY_IN_PAST
  readonly errorCode = ApiKeyExpiryInPastException.errorCode

  constructor() {
    super('Expiry date must be in the future')
    this.name = 'ApiKeyExpiryInPastException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
