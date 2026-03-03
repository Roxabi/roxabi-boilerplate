// Domain exception -- pure TypeScript, no NestJS imports (per backend-patterns 1.3)
import { ErrorCode } from '../../common/errorCodes.js'

export class OrgNotDeletedException extends Error {
  static readonly errorCode = ErrorCode.ORG_NOT_DELETED
  readonly errorCode = OrgNotDeletedException.errorCode

  constructor(public readonly orgId: string) {
    super(`Organization ${orgId} is not scheduled for deletion`)
    this.name = 'OrgNotDeletedException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
