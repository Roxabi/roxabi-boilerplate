import { ErrorCode } from '../../common/errorCodes.js'

export class OrgDepthExceededException extends Error {
  static readonly errorCode = ErrorCode.ADMIN_ORG_DEPTH_EXCEEDED
  readonly errorCode = OrgDepthExceededException.errorCode

  constructor() {
    super('Maximum organization depth of 3 levels exceeded')
    this.name = 'OrgDepthExceededException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
