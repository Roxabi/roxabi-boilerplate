import { Inject, Injectable } from '@nestjs/common'
import { SettingNotFoundException } from './exceptions/settingNotFound.exception.js'
import { SettingValidationException } from './exceptions/settingValidation.exception.js'
import {
  SYSTEM_SETTINGS_REPO,
  type SystemSettingRow,
  type SystemSettingsRepository,
} from './systemSettings.repository.js'

@Injectable()
export class SystemSettingsService {
  constructor(@Inject(SYSTEM_SETTINGS_REPO) private readonly repo: SystemSettingsRepository) {}

  async getValue<T = unknown>(key: string): Promise<T | null> {
    const row = await this.repo.findByKey(key)
    if (!row) return null
    return row.value as T
  }

  async getAll() {
    return this.repo.findAll()
  }

  async getByCategory(category: string) {
    return this.repo.findByCategory(category)
  }

  async batchUpdate(updates: Array<{ key: string; value: unknown }>): Promise<{
    updated: SystemSettingRow[]
    beforeState: Record<string, unknown>
  }> {
    if (updates.length === 0) {
      return { updated: [], beforeState: {} }
    }

    // Phase 1: Read all settings and validate before any writes
    const existingSettings: SystemSettingRow[] = []

    for (const update of updates) {
      const existing = await this.repo.findByKey(update.key)
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

    const updated: SystemSettingRow[] = []
    for (const update of updates) {
      const result = await this.repo.updateByKey(update.key, update.value)
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
