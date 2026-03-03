import { ErrorCode } from '../../common/errorCodes.js'

export class LastOwnerConstraintException extends Error {
  static readonly errorCode = ErrorCode.LAST_OWNER_CONSTRAINT
  readonly errorCode = LastOwnerConstraintException.errorCode

  constructor() {
    super('Cannot remove the last owner of the organization')
    this.name = 'LastOwnerConstraintException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
