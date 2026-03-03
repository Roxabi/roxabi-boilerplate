import { ErrorCode } from '../../common/errorCodes.js'

export class MemberAlreadyExistsException extends Error {
  static readonly errorCode = ErrorCode.MEMBER_ALREADY_EXISTS
  readonly errorCode = MemberAlreadyExistsException.errorCode

  constructor() {
    super('A member with this email already exists in this organization')
    this.name = 'MemberAlreadyExistsException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
