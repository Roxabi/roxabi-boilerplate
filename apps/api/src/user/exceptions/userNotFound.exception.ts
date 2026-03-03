// Domain exception — pure TypeScript, no NestJS imports (per backend-patterns §1.3)
import { ErrorCode } from '../../common/errorCodes.js'

export class UserNotFoundException extends Error {
  static readonly errorCode = ErrorCode.USER_NOT_FOUND
  readonly errorCode = UserNotFoundException.errorCode

  constructor(public readonly userId: string) {
    super(`User ${userId} not found`)
    this.name = 'UserNotFoundException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
