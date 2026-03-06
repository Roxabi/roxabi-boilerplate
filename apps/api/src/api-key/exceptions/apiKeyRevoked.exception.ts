import { ErrorCode } from '../../common/errorCodes.js'

export class ApiKeyRevokedException extends Error {
  static readonly errorCode = ErrorCode.API_KEY_REVOKED
  readonly errorCode = ApiKeyRevokedException.errorCode

  constructor() {
    super('API key has been revoked')
    this.name = 'ApiKeyRevokedException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
