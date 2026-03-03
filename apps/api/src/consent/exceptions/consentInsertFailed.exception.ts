// Domain exception — pure TypeScript, no NestJS imports (per backend-patterns §1.3)
import { ErrorCode } from '../../common/errorCodes.js'

export class ConsentInsertFailedException extends Error {
  static readonly errorCode = ErrorCode.CONSENT_INSERT_FAILED
  readonly errorCode = ConsentInsertFailedException.errorCode

  constructor(private readonly userId: string) {
    super('Failed to save consent record')
    this.name = 'ConsentInsertFailedException'
    Object.setPrototypeOf(this, new.target.prototype)
  }

  getUserId(): string {
    return this.userId
  }
}
