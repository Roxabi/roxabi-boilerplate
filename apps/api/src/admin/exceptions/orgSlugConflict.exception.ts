import { ErrorCode } from '../../common/errorCodes.js'

export class OrgSlugConflictException extends Error {
  static readonly errorCode = ErrorCode.ADMIN_ORG_SLUG_CONFLICT
  readonly errorCode = OrgSlugConflictException.errorCode

  constructor() {
    super('An organization with this slug already exists')
    this.name = 'OrgSlugConflictException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
