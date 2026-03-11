import { Inject, Injectable } from '@nestjs/common'
import type { SettingType, SystemSetting } from '@repo/types'
import { eq } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import { systemSettings } from '../../database/schema/systemSettings.schema.js'
import type { SystemSettingsRepository } from '../systemSettings.repository.js'

// RLS-BYPASS: superadmin-only endpoint — @Roles('superadmin') enforced at controller level

const VALID_SETTING_TYPES = [
  'string',
  'number',
  'boolean',
  'select',
] as const satisfies readonly SettingType[]

function parseSettingType(raw: string): SettingType {
  if (!(VALID_SETTING_TYPES as readonly string[]).includes(raw)) {
    throw new Error(`Unknown setting type in database: "${raw}"`)
  }
  return raw as SettingType
}

function parseMetadata(raw: unknown): SystemSetting['metadata'] {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as SystemSetting['metadata']
}

function toSystemSetting(row: typeof systemSettings.$inferSelect): SystemSetting {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    type: parseSettingType(row.type),
    name: row.name,
    description: row.description ?? null,
    category: row.category,
    metadata: parseMetadata(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

@Injectable()
export class DrizzleSystemSettingsRepository implements SystemSettingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByKey(key: string, tx?: DrizzleTx): Promise<SystemSetting | null> {
    const qb = tx ?? this.db
    const rows = await qb.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1)
    return rows[0] ? toSystemSetting(rows[0]) : null
  }

  async findAll(tx?: DrizzleTx): Promise<SystemSetting[]> {
    const qb = tx ?? this.db
    const rows = await qb.select().from(systemSettings)
    return rows.map(toSystemSetting)
  }

  async findByCategory(category: string, tx?: DrizzleTx): Promise<SystemSetting[]> {
    const qb = tx ?? this.db
    const rows = await qb.select().from(systemSettings).where(eq(systemSettings.category, category))
    return rows.map(toSystemSetting)
  }

  async updateByKey(key: string, value: unknown, tx?: DrizzleTx): Promise<SystemSetting | null> {
    const qb = tx ?? this.db
    const rows = await qb
      .update(systemSettings)
      .set({ value })
      .where(eq(systemSettings.key, key))
      .returning()
    return rows[0] ? toSystemSetting(rows[0]) : null
  }
}
