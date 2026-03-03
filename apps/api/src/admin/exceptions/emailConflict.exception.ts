import { ErrorCode } from '../../common/errorCodes.js'

export class EmailConflictException extends Error {
  static readonly errorCode = ErrorCode.EMAIL_CONFLICT
  readonly errorCode = EmailConflictException.errorCode

  constructor() {
    super('A user with this email already exists')
    this.name = 'EmailConflictException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
