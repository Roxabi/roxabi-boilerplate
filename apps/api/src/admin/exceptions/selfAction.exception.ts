import { ErrorCode } from '../../common/errorCodes.js'

export class SelfActionException extends Error {
  static readonly errorCode = ErrorCode.SELF_ACTION
  readonly errorCode = SelfActionException.errorCode

  constructor() {
    super('Cannot perform this action on your own account')
    this.name = 'SelfActionException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
