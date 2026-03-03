import { ErrorCode } from '../../common/errorCodes.js'

export class OwnershipConstraintException extends Error {
  static readonly errorCode = ErrorCode.OWNERSHIP_CONSTRAINT
  readonly errorCode = OwnershipConstraintException.errorCode

  constructor(message: string) {
    super(message)
    this.name = 'OwnershipConstraintException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
