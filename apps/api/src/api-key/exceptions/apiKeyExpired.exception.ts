import { ErrorCode } from '../../common/errorCodes.js'

export class ApiKeyExpiredException extends Error {
  static readonly errorCode = ErrorCode.API_KEY_EXPIRED
  readonly errorCode = ApiKeyExpiredException.errorCode

  constructor() {
    super('API key has expired')
    this.name = 'ApiKeyExpiredException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
