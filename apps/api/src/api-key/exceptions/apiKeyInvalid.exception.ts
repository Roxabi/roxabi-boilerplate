import { ErrorCode } from '../../common/errorCodes.js'

export class ApiKeyInvalidException extends Error {
  static readonly errorCode = ErrorCode.API_KEY_INVALID
  readonly errorCode = ApiKeyInvalidException.errorCode

  constructor() {
    super('Invalid API key')
    this.name = 'ApiKeyInvalidException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
