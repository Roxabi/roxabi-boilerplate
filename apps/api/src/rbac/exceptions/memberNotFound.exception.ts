import { ErrorCode } from '../../common/errorCodes.js'

export class MemberNotFoundException extends Error {
  static readonly errorCode = ErrorCode.MEMBER_NOT_FOUND
  readonly errorCode = MemberNotFoundException.errorCode

  constructor(memberId: string) {
    super(`Member "${memberId}" not found`)
    this.name = 'MemberNotFoundException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
