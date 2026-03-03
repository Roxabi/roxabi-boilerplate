// Domain exception -- pure TypeScript, no NestJS imports (per backend-patterns 1.3)
import { ErrorCode } from '../../common/errorCodes.js'

export class OrgNameConfirmationMismatchException extends Error {
  static readonly errorCode = ErrorCode.ORG_NAME_CONFIRMATION_MISMATCH
  readonly errorCode = OrgNameConfirmationMismatchException.errorCode

  constructor() {
    super('Organization name confirmation does not match')
    this.name = 'OrgNameConfirmationMismatchException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
