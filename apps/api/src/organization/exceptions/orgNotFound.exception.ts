// Domain exception -- pure TypeScript, no NestJS imports (per backend-patterns 1.3)
import { ErrorCode } from '../../common/errorCodes.js'

export class OrgNotFoundException extends Error {
  static readonly errorCode = ErrorCode.ORG_NOT_FOUND
  readonly errorCode = OrgNotFoundException.errorCode

  constructor(public readonly orgId: string) {
    super(`Organization ${orgId} not found`)
    this.name = 'OrgNotFoundException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
