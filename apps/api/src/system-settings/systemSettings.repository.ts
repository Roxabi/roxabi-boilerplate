import type { SystemSetting } from '@repo/types'
import type { DrizzleTx } from '../database/drizzle.provider.js'

export const SYSTEM_SETTINGS_REPO = Symbol('SYSTEM_SETTINGS_REPO')

export interface SystemSettingsRepository {
  findByKey(key: string, tx?: DrizzleTx): Promise<SystemSetting | null>
  findAll(tx?: DrizzleTx): Promise<SystemSetting[]>
  findByCategory(category: string, tx?: DrizzleTx): Promise<SystemSetting[]>
  updateByKey(key: string, value: unknown, tx?: DrizzleTx): Promise<SystemSetting | null>
}
