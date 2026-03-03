import { ErrorCode } from '../../common/errorCodes.js'

export class InvitationNotFoundException extends Error {
  static readonly errorCode = ErrorCode.INVITATION_NOT_FOUND
  readonly errorCode = InvitationNotFoundException.errorCode

  constructor(invitationId: string) {
    super(`Invitation "${invitationId}" not found`)
    this.name = 'InvitationNotFoundException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
