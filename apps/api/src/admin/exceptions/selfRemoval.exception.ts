import { ErrorCode } from '../../common/errorCodes.js'

export class SelfRemovalException extends Error {
  static readonly errorCode = ErrorCode.SELF_REMOVAL
  readonly errorCode = SelfRemovalException.errorCode

  constructor() {
    super('Cannot remove yourself from the organization')
    this.name = 'SelfRemovalException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
