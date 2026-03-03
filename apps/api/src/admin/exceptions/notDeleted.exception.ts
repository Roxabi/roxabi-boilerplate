import { ErrorCode } from '../../common/errorCodes.js'

export class NotDeletedException extends Error {
  static readonly errorCode = ErrorCode.NOT_DELETED
  readonly errorCode = NotDeletedException.errorCode

  constructor(resource: string, id: string) {
    super(`${resource} ${id} is not deleted`)
    this.name = 'NotDeletedException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
