// Domain exception -- pure TypeScript, no NestJS imports (per backend-patterns 1.3)
import { ErrorCode } from '../../common/errorCodes.js'

export class TransferTargetNotMemberException extends Error {
  static readonly errorCode = ErrorCode.TRANSFER_TARGET_NOT_MEMBER
  readonly errorCode = TransferTargetNotMemberException.errorCode

  constructor(
    public readonly targetUserId: string,
    public readonly orgId: string
  ) {
    super(`User ${targetUserId} is not a member of organization ${orgId}`)
    this.name = 'TransferTargetNotMemberException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
