import { ErrorCode } from '../../common/errorCodes.js'

export class TenantContextMissingException extends Error {
  static readonly errorCode = ErrorCode.TENANT_CONTEXT_MISSING
  readonly errorCode = TenantContextMissingException.errorCode

  constructor() {
    super('No tenant context available')
    this.name = 'TenantContextMissingException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
