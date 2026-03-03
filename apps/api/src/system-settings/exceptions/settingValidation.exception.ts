import { ErrorCode } from '../../common/errorCodes.js'

export class SettingValidationException extends Error {
  static readonly errorCode = ErrorCode.SETTING_VALIDATION
  readonly errorCode = SettingValidationException.errorCode

  constructor(key: string, expectedType: string, receivedType: string) {
    super(
      `Invalid value for setting "${key}": expected type "${expectedType}", received "${receivedType}"`
    )
    this.name = 'SettingValidationException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
