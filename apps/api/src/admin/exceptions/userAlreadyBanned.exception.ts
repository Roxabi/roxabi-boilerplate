import { ErrorCode } from '../../common/errorCodes.js'

export class UserAlreadyBannedException extends Error {
  static readonly errorCode = ErrorCode.USER_ALREADY_BANNED
  readonly errorCode = UserAlreadyBannedException.errorCode

  constructor(userId: string) {
    super(`User "${userId}" is already banned`)
    this.name = 'UserAlreadyBannedException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
