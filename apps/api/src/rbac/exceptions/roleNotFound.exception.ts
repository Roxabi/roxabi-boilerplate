import { ErrorCode } from '../../common/errorCodes.js'

export class RoleNotFoundException extends Error {
  static readonly errorCode = ErrorCode.ROLE_NOT_FOUND
  readonly errorCode = RoleNotFoundException.errorCode

  constructor(public readonly roleId: string) {
    super(`Role ${roleId} not found`)
    this.name = 'RoleNotFoundException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
