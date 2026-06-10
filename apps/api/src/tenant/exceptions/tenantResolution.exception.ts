import { ErrorCode } from '../../common/errorCodes.js'

export class TenantResolutionException extends Error {
  static readonly errorCode = ErrorCode.TENANT_CONTEXT_MISSING
  readonly errorCode = TenantResolutionException.errorCode

  constructor(message = 'Failed to resolve tenant context') {
    super(message)
    this.name = 'TenantResolutionException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
