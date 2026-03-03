import { ErrorCode } from '../../common/errorCodes.js'

export class RoleInsertFailedException extends Error {
  static readonly errorCode = ErrorCode.ROLE_INSERT_FAILED
  readonly errorCode = RoleInsertFailedException.errorCode

  constructor() {
    super('Failed to insert role')
    this.name = 'RoleInsertFailedException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
