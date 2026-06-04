import { ErrorCode } from '../../common/errorCodes.js'

export class TenantResolutionException extends Error {
  static readonly errorCode = ErrorCode.TENANT_CONTEXT_MISSING
  readonly errorCode = TenantResolutionException.errorCode

  constructor() {
    super('Failed to resolve tenant context')
    this.name = 'TenantResolutionException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
