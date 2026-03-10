import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import { systemSettings } from '../../database/schema/systemSettings.schema.js'
import type { SystemSettingRow, SystemSettingsRepository } from '../systemSettings.repository.js'

// RLS-BYPASS: superadmin-only endpoint — @Roles('superadmin') enforced at controller level
@Injectable()
export class DrizzleSystemSettingsRepository implements SystemSettingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByKey(key: string, tx?: DrizzleTx): Promise<SystemSettingRow | null> {
    const qb = tx ?? this.db
    const rows = await qb.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1)
    return rows[0] ?? null
  }

  async findAll(tx?: DrizzleTx): Promise<SystemSettingRow[]> {
    const qb = tx ?? this.db
    return qb.select().from(systemSettings)
  }

  async findByCategory(category: string, tx?: DrizzleTx): Promise<SystemSettingRow[]> {
    const qb = tx ?? this.db
    return qb.select().from(systemSettings).where(eq(systemSettings.category, category))
  }

  async updateByKey(key: string, value: unknown, tx?: DrizzleTx): Promise<SystemSettingRow | null> {
    const qb = tx ?? this.db
    const rows = await qb
      .update(systemSettings)
      .set({ value })
      .where(eq(systemSettings.key, key))
      .returning()
    return rows[0] ?? null
  }
}
