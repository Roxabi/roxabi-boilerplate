import { ErrorCode } from '../../common/errorCodes.js'

export class AdminRoleNotFoundException extends Error {
  static readonly errorCode = ErrorCode.ADMIN_ROLE_NOT_FOUND
  readonly errorCode = AdminRoleNotFoundException.errorCode

  constructor(roleId: string) {
    super(`Role "${roleId}" not found`)
    this.name = 'AdminRoleNotFoundException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
