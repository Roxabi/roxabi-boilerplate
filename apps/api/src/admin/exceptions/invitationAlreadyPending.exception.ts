import { ErrorCode } from '../../common/errorCodes.js'

export class InvitationAlreadyPendingException extends Error {
  static readonly errorCode = ErrorCode.INVITATION_ALREADY_PENDING
  readonly errorCode = InvitationAlreadyPendingException.errorCode

  constructor() {
    super('A pending invitation already exists for this email')
    this.name = 'InvitationAlreadyPendingException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
