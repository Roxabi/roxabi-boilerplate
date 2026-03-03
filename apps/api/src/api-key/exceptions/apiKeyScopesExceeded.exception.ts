import { ErrorCode } from '../../common/errorCodes.js'

export class ApiKeyScopesExceededException extends Error {
  static readonly errorCode = ErrorCode.API_KEY_SCOPES_EXCEEDED
  readonly errorCode = ApiKeyScopesExceededException.errorCode

  constructor() {
    super('Requested scopes exceed your current permissions')
    this.name = 'ApiKeyScopesExceededException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
