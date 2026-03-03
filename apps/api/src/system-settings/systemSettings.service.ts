import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider.js'
import { systemSettings } from '../database/schema/systemSettings.schema.js'
import { SettingNotFoundException } from './exceptions/settingNotFound.exception.js'
import { SettingValidationException } from './exceptions/settingValidation.exception.js'

@Injectable()
export class SystemSettingsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getValue<T = unknown>(key: string): Promise<T | null> {
    const rows = await this.db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1)

    const row = rows[0]
    if (!row) return null
    return row.value as T
  }

  async getAll() {
    return this.db.select().from(systemSettings)
  }

  async getByCategory(category: string) {
    return this.db.select().from(systemSettings).where(eq(systemSettings.category, category))
  }

  async batchUpdate(updates: Array<{ key: string; value: unknown }>): Promise<{
    updated: Array<Record<string, unknown>>
    beforeState: Record<string, unknown>
  }> {
    if (updates.length === 0) {
      return { updated: [], beforeState: {} }
    }

    // Phase 1: Read all settings and validate before any writes
    const existingSettings: Array<{
      key: string
      value: unknown
      type: string
      metadata: { options?: string[] } | null
    }> = []

    for (const update of updates) {
      const rows = await this.db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, update.key))
        .limit(1)

      const existing = rows[0]
      if (!existing) {
        throw new SettingNotFoundException(update.key)
      }

      this.validateSettingValue(update.key, update.value, existing.type, existing.metadata)
      existingSettings.push(existing)
    }

    // Phase 2: Build beforeState and perform all updates
    const beforeState: Record<string, unknown> = {}
    for (const existing of existingSettings) {
      beforeState[existing.key] = existing.value
    }

    const updated: Array<Record<string, unknown>> = []
    for (const update of updates) {
      const [result] = await this.db
        .update(systemSettings)
        .set({ value: update.value })
        .where(eq(systemSettings.key, update.key))
        .returning()

      if (result) {
        updated.push(result)
      }
    }

    return { updated, beforeState }
  }

  private validateSettingValue(
    key: string,
    value: unknown,
    type: string,
    metadata: { options?: string[] } | null
  ): void {
    const actualType = typeof value

    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new SettingValidationException(key, 'string', actualType)
        }
        break
      case 'number':
        if (typeof value !== 'number' || Number.isNaN(value)) {
          throw new SettingValidationException(key, 'number', actualType)
        }
        break
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new SettingValidationException(key, 'boolean', actualType)
        }
        break
      case 'select':
        if (typeof value !== 'string' || !metadata?.options?.includes(value)) {
          throw new SettingValidationException(key, 'select', actualType)
        }
        break
    }
  }
}
