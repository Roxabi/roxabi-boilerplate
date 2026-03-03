import { ErrorCode } from '../../common/errorCodes.js'

export class AdminMemberNotFoundException extends Error {
  static readonly errorCode = ErrorCode.ADMIN_MEMBER_NOT_FOUND
  readonly errorCode = AdminMemberNotFoundException.errorCode

  constructor(memberId: string) {
    super(`Member "${memberId}" not found`)
    this.name = 'AdminMemberNotFoundException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
