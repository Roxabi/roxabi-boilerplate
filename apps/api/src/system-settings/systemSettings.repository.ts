import type { DrizzleTx } from '../database/drizzle.provider.js'
import type { systemSettings } from '../database/schema/systemSettings.schema.js'

export const SYSTEM_SETTINGS_REPO = Symbol('SYSTEM_SETTINGS_REPO')

export type SystemSettingRow = typeof systemSettings.$inferSelect

export interface SystemSettingsRepository {
  findByKey(key: string, tx?: DrizzleTx): Promise<SystemSettingRow | null>
  findAll(tx?: DrizzleTx): Promise<SystemSettingRow[]>
  findByCategory(category: string, tx?: DrizzleTx): Promise<SystemSettingRow[]>
  updateByKey(key: string, value: unknown, tx?: DrizzleTx): Promise<SystemSettingRow | null>
}
