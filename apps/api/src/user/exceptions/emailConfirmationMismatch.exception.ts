// Domain exception -- pure TypeScript, no NestJS imports (per backend-patterns 1.3)
import { ErrorCode } from '../../common/errorCodes.js'

export class EmailConfirmationMismatchException extends Error {
  static readonly errorCode = ErrorCode.EMAIL_CONFIRMATION_MISMATCH
  readonly errorCode = EmailConfirmationMismatchException.errorCode

  constructor() {
    super('Email confirmation does not match')
    this.name = 'EmailConfirmationMismatchException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
