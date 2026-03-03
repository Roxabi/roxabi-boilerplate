// Domain exception -- pure TypeScript, no NestJS imports (per backend-patterns 1.3)
import { ErrorCode } from '../../common/errorCodes.js'

export class AccountNotDeletedException extends Error {
  static readonly errorCode = ErrorCode.ACCOUNT_NOT_DELETED
  readonly errorCode = AccountNotDeletedException.errorCode

  constructor() {
    super('Account must be scheduled for deletion before it can be permanently deleted')
    this.name = 'AccountNotDeletedException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
