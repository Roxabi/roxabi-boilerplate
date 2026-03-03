import { ErrorCode } from '../../common/errorCodes.js'

export class LastSuperadminException extends Error {
  static readonly errorCode = ErrorCode.LAST_SUPERADMIN
  readonly errorCode = LastSuperadminException.errorCode

  constructor() {
    super('You are the last active superadmin and cannot change your role')
    this.name = 'LastSuperadminException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
