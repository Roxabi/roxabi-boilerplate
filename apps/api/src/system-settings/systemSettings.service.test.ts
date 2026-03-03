import { describe, expect, it, vi } from 'vitest'
import { SettingNotFoundException } from './exceptions/settingNotFound.exception.js'
import { SettingValidationException } from './exceptions/settingValidation.exception.js'
import { SystemSettingsService } from './systemSettings.service.js'

// Drizzle builder chain shapes used by SystemSettingsService:
//   getValue:      select().from().where().limit() → returns array
//   getAll:        select().from()                → returns array
//   getByCategory: select().from().where()        → returns array
//   batchUpdate:   select().from().where().limit() (lookup) + update().set().where().returning()

function createMockDb() {
  // Default chain — callers override the terminal fn per test
  const limitFn = vi.fn().mockResolvedValue([])
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn })
  const fromFn = vi.fn().mockReturnValue({ where: whereFn })
  const selectFn = vi.fn().mockReturnValue({ from: fromFn })

  // Update chain: update().set().where().returning()
  const returningFn = vi.fn().mockResolvedValue([])
  const updateWhereFn = vi.fn().mockReturnValue({ returning: returningFn })
  const setFn = vi.fn().mockReturnValue({ where: updateWhereFn })
  const updateFn = vi.fn().mockReturnValue({ set: setFn })

  return {
    select: selectFn,
    update: updateFn,
    _limitFn: limitFn,
    _whereFn: whereFn,
    _fromFn: fromFn,
    _returningFn: returningFn,
    _updateWhereFn: updateWhereFn,
    _setFn: setFn,
  }
}

describe('SystemSettingsService', () => {
  describe('getValue()', () => {
    it('should return the typed value when the setting exists', async () => {
      // Arrange
      const db = createMockDb()
      db._limitFn.mockResolvedValue([{ key: 'app.name', value: 'Roxabi', category: 'General' }])
      const service = new SystemSettingsService(db as never)

      // Act
      const result = await service.getValue<string>('app.name')

      // Assert
      expect(result).toBe('Roxabi')
    })

    it('should return null when the setting does not exist', async () => {
      // Arrange
      const db = createMockDb()
      db._limitFn.mockResolvedValue([])
      const service = new SystemSettingsService(db as never)

      // Act
      const result = await service.getValue('nonexistent')

      // Assert
      expect(result).toBeNull()
    })

    it('should query by the provided key', async () => {
      // Arrange
      const db = createMockDb()
      db._limitFn.mockResolvedValue([{ key: 'app.name', value: 'Roxabi', category: 'General' }])
      const service = new SystemSettingsService(db as never)

      // Act
      await service.getValue('app.name')

      // Assert — where() should receive an expression built from the key
      expect(db._whereFn).toHaveBeenCalledOnce()
    })
  })

  describe('getAll()', () => {
    it('should return all settings from the database', async () => {
      // Arrange
      const mockSettings = [
        { key: 'app.name', value: 'Roxabi', category: 'General' },
        { key: 'app.support_email', value: 'support@roxabi.com', category: 'General' },
        { key: 'email.from_name', value: 'Roxabi Team', category: 'Email' },
      ]
      const fromFn = vi.fn().mockResolvedValue(mockSettings)
      const db = {
        select: vi.fn().mockReturnValue({ from: fromFn }),
      }
      const service = new SystemSettingsService(db as never)

      // Act
      const result = await service.getAll()

      // Assert
      expect(result).toEqual(mockSettings)
    })

    it('should return an empty array when no settings exist', async () => {
      // Arrange
      const fromFn = vi.fn().mockResolvedValue([])
      const db = {
        select: vi.fn().mockReturnValue({ from: fromFn }),
      }
      const service = new SystemSettingsService(db as never)

      // Act
      const result = await service.getAll()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('getByCategory()', () => {
    it('should return only settings belonging to the given category', async () => {
      // Arrange
      const generalSettings = [
        { key: 'app.name', value: 'Roxabi', category: 'General' },
        { key: 'app.support_email', value: 'support@roxabi.com', category: 'General' },
      ]
      const db = createMockDb()
      // getByCategory uses select().from().where() — resolve where() directly
      db._whereFn.mockResolvedValue(generalSettings)
      const service = new SystemSettingsService(db as never)

      // Act
      const result = await service.getByCategory('General')

      // Assert
      expect(result).toEqual(generalSettings)
    })

    it('should return an empty array when no settings match the category', async () => {
      // Arrange
      const db = createMockDb()
      db._whereFn.mockResolvedValue([])
      const service = new SystemSettingsService(db as never)

      // Act
      const result = await service.getByCategory('Unknown')

      // Assert
      expect(result).toEqual([])
    })

    it('should filter by the provided category value', async () => {
      // Arrange
      const db = createMockDb()
      db._whereFn.mockResolvedValue([])
      const service = new SystemSettingsService(db as never)

      // Act
      await service.getByCategory('Email')

      // Assert — where() should have been called with a category expression
      expect(db._whereFn).toHaveBeenCalledOnce()
    })
  })

  describe('batchUpdate()', () => {
    it('should read before-state, update each setting, and return updated rows with beforeState', async () => {
      // Arrange
      const existingSetting = {
        id: '1',
        key: 'app.name',
        value: 'Roxabi',
        type: 'string',
        name: 'App Name',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      }
      const updatedSetting = {
        ...existingSetting,
        value: 'NewName',
        updatedAt: new Date('2026-02-01'),
      }
      const db = createMockDb()
      // getValue lookup (select().from().where().limit()) returns existing setting
      db._limitFn.mockResolvedValue([existingSetting])
      // update().set().where().returning() returns updated setting
      db._returningFn.mockResolvedValue([updatedSetting])
      const service = new SystemSettingsService(db as never)

      // Act
      const result = await service.batchUpdate([{ key: 'app.name', value: 'NewName' }])

      // Assert
      expect(result.updated).toEqual([updatedSetting])
      expect(result.beforeState).toEqual({ 'app.name': 'Roxabi' })
    })

    it('should update multiple settings and return all before-states', async () => {
      // Arrange
      const settingA = {
        id: '1',
        key: 'app.name',
        value: 'Roxabi',
        type: 'string',
        name: 'App Name',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const settingB = {
        id: '2',
        key: 'app.support_email',
        value: 'old@example.com',
        type: 'string',
        name: 'Support Email',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const updatedA = { ...settingA, value: 'NewApp' }
      const updatedB = { ...settingB, value: 'new@example.com' }

      const db = createMockDb()
      // Each getValue call resolves to the respective setting
      db._limitFn.mockResolvedValueOnce([settingA]).mockResolvedValueOnce([settingB])
      db._returningFn.mockResolvedValueOnce([updatedA]).mockResolvedValueOnce([updatedB])
      const service = new SystemSettingsService(db as never)

      // Act
      const result = await service.batchUpdate([
        { key: 'app.name', value: 'NewApp' },
        { key: 'app.support_email', value: 'new@example.com' },
      ])

      // Assert
      expect(result.updated).toEqual([updatedA, updatedB])
      expect(result.beforeState).toEqual({
        'app.name': 'Roxabi',
        'app.support_email': 'old@example.com',
      })
    })

    it('should throw SettingNotFoundException when key does not exist', async () => {
      // Arrange
      const db = createMockDb()
      // getValue lookup returns empty array — setting not found
      db._limitFn.mockResolvedValue([])
      const service = new SystemSettingsService(db as never)

      // Act & Assert
      await expect(
        service.batchUpdate([{ key: 'nonexistent.key', value: 'value' }])
      ).rejects.toThrow(SettingNotFoundException)
    })

    it('should throw SettingValidationException when value type does not match setting type', async () => {
      // Arrange
      const numberSetting = {
        id: '1',
        key: 'app.max_users',
        value: 100,
        type: 'number',
        name: 'Max Users',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const db = createMockDb()
      db._limitFn.mockResolvedValue([numberSetting])
      const service = new SystemSettingsService(db as never)

      // Act & Assert — string value for a number setting should be rejected
      await expect(
        service.batchUpdate([{ key: 'app.max_users', value: 'not-a-number' }])
      ).rejects.toThrow(SettingValidationException)
    })

    it('should throw SettingValidationException when boolean setting receives non-boolean value', async () => {
      // Arrange
      const boolSetting = {
        id: '1',
        key: 'app.feature_enabled',
        value: true,
        type: 'boolean',
        name: 'Feature Enabled',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const db = createMockDb()
      db._limitFn.mockResolvedValue([boolSetting])
      const service = new SystemSettingsService(db as never)

      // Act & Assert
      await expect(
        service.batchUpdate([{ key: 'app.feature_enabled', value: 'yes' }])
      ).rejects.toThrow(SettingValidationException)
    })

    it('should throw SettingValidationException when select setting receives value not in options', async () => {
      // Arrange
      const selectSetting = {
        id: '1',
        key: 'app.theme',
        value: 'light',
        type: 'select',
        name: 'Theme',
        description: null,
        category: 'General',
        metadata: { options: ['light', 'dark', 'system'] },
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const db = createMockDb()
      db._limitFn.mockResolvedValue([selectSetting])
      const service = new SystemSettingsService(db as never)

      // Act & Assert
      await expect(
        service.batchUpdate([{ key: 'app.theme', value: 'invalid-theme' }])
      ).rejects.toThrow(SettingValidationException)
    })

    it('should accept a valid string value for a string setting', async () => {
      // Arrange
      const stringSetting = {
        id: '1',
        key: 'app.name',
        value: 'Roxabi',
        type: 'string',
        name: 'App Name',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const updatedSetting = { ...stringSetting, value: 'NewName' }
      const db = createMockDb()
      db._limitFn.mockResolvedValue([stringSetting])
      db._returningFn.mockResolvedValue([updatedSetting])
      const service = new SystemSettingsService(db as never)

      // Act — valid string value must NOT throw
      const result = await service.batchUpdate([{ key: 'app.name', value: 'NewName' }])

      // Assert
      expect(result.updated).toEqual([updatedSetting])
    })

    it('should accept a valid number value for a number setting', async () => {
      // Arrange
      const numberSetting = {
        id: '1',
        key: 'app.max_users',
        value: 100,
        type: 'number',
        name: 'Max Users',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const updatedSetting = { ...numberSetting, value: 200 }
      const db = createMockDb()
      db._limitFn.mockResolvedValue([numberSetting])
      db._returningFn.mockResolvedValue([updatedSetting])
      const service = new SystemSettingsService(db as never)

      // Act — valid number value must NOT throw
      const result = await service.batchUpdate([{ key: 'app.max_users', value: 200 }])

      // Assert
      expect(result.updated).toEqual([updatedSetting])
    })

    it('should throw SettingValidationException when number setting receives NaN', async () => {
      // Arrange
      const numberSetting = {
        id: '1',
        key: 'app.max_users',
        value: 100,
        type: 'number',
        name: 'Max Users',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const db = createMockDb()
      db._limitFn.mockResolvedValue([numberSetting])
      const service = new SystemSettingsService(db as never)

      // Act & Assert — NaN is typeof 'number' but should still be rejected
      await expect(
        service.batchUpdate([{ key: 'app.max_users', value: Number.NaN }])
      ).rejects.toThrow(SettingValidationException)
    })

    it('should accept a valid boolean value for a boolean setting', async () => {
      // Arrange
      const boolSetting = {
        id: '1',
        key: 'app.feature_enabled',
        value: true,
        type: 'boolean',
        name: 'Feature Enabled',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const updatedSetting = { ...boolSetting, value: false }
      const db = createMockDb()
      db._limitFn.mockResolvedValue([boolSetting])
      db._returningFn.mockResolvedValue([updatedSetting])
      const service = new SystemSettingsService(db as never)

      // Act — valid boolean value must NOT throw
      const result = await service.batchUpdate([{ key: 'app.feature_enabled', value: false }])

      // Assert
      expect(result.updated).toEqual([updatedSetting])
    })

    it('should accept a valid option value for a select setting', async () => {
      // Arrange
      const selectSetting = {
        id: '1',
        key: 'app.theme',
        value: 'light',
        type: 'select',
        name: 'Theme',
        description: null,
        category: 'General',
        metadata: { options: ['light', 'dark', 'system'] },
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const updatedSetting = { ...selectSetting, value: 'dark' }
      const db = createMockDb()
      db._limitFn.mockResolvedValue([selectSetting])
      db._returningFn.mockResolvedValue([updatedSetting])
      const service = new SystemSettingsService(db as never)

      // Act — valid option in the options list must NOT throw
      const result = await service.batchUpdate([{ key: 'app.theme', value: 'dark' }])

      // Assert
      expect(result.updated).toEqual([updatedSetting])
    })

    it('should return empty updated array and empty beforeState for empty updates array', async () => {
      // Arrange
      const db = createMockDb()
      const service = new SystemSettingsService(db as never)

      // Act
      const result = await service.batchUpdate([])

      // Assert — no-op: no DB reads or writes
      expect(result.updated).toEqual([])
      expect(result.beforeState).toEqual({})
      expect(db.select).not.toHaveBeenCalled()
      expect(db.update).not.toHaveBeenCalled()
    })

    it('should reject entire batch before any updates when first update has invalid type', async () => {
      // Arrange — first setting is number type, receives string value
      const numberSetting = {
        id: '1',
        key: 'app.max_users',
        value: 100,
        type: 'number',
        name: 'Max Users',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const db = createMockDb()
      db._limitFn.mockResolvedValue([numberSetting])
      const service = new SystemSettingsService(db as never)

      // Act & Assert
      await expect(
        service.batchUpdate([
          { key: 'app.max_users', value: 'oops' },
          { key: 'app.name', value: 'Valid Value' },
        ])
      ).rejects.toThrow(SettingValidationException)

      // Assert — no updates should have been written to the database
      expect(db.update).not.toHaveBeenCalled()
    })
  })
})
