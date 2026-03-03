import { ErrorCode } from '../../common/errorCodes.js'

export class SettingNotFoundException extends Error {
  static readonly errorCode = ErrorCode.SETTING_NOT_FOUND
  readonly errorCode = SettingNotFoundException.errorCode

  constructor(key: string) {
    super(`Setting "${key}" not found`)
    this.name = 'SettingNotFoundException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
