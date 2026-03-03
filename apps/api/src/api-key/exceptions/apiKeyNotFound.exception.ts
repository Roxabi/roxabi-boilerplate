import { ErrorCode } from '../../common/errorCodes.js'

export class ApiKeyNotFoundException extends Error {
  static readonly errorCode = ErrorCode.API_KEY_NOT_FOUND
  readonly errorCode = ApiKeyNotFoundException.errorCode

  constructor(keyId: string) {
    super(`API key "${keyId}" not found`)
    this.name = 'ApiKeyNotFoundException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
