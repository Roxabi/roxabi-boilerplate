// Domain exception -- pure TypeScript, no NestJS imports (per backend-patterns 1.3)
import { ErrorCode } from '../../common/errorCodes.js'

export class AccountAlreadyDeletedException extends Error {
  static readonly errorCode = ErrorCode.ACCOUNT_ALREADY_DELETED
  readonly errorCode = AccountAlreadyDeletedException.errorCode

  constructor() {
    super('Account is already scheduled for deletion')
    this.name = 'AccountAlreadyDeletedException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
