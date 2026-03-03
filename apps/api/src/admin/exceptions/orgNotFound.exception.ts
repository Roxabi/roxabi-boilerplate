import { ErrorCode } from '../../common/errorCodes.js'

export class AdminOrgNotFoundException extends Error {
  static readonly errorCode = ErrorCode.ADMIN_ORG_NOT_FOUND
  readonly errorCode = AdminOrgNotFoundException.errorCode

  constructor(orgId: string) {
    super(`Organization "${orgId}" not found`)
    this.name = 'AdminOrgNotFoundException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
