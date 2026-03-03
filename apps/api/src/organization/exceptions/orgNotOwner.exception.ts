// Domain exception -- pure TypeScript, no NestJS imports (per backend-patterns 1.3)
import { ErrorCode } from '../../common/errorCodes.js'

export class OrgNotOwnerException extends Error {
  static readonly errorCode = ErrorCode.ORG_NOT_OWNER
  readonly errorCode = OrgNotOwnerException.errorCode

  constructor(public readonly orgId: string) {
    super(`User is not an owner of organization ${orgId}`)
    this.name = 'OrgNotOwnerException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
