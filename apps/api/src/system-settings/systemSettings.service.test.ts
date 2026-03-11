import type { SystemSetting } from '@repo/types'
import type { Mock } from 'vitest'
import { describe, expect, it, vi } from 'vitest'
import { SettingNotFoundException } from './exceptions/settingNotFound.exception.js'
import { SettingValidationException } from './exceptions/settingValidation.exception.js'
import type { SystemSettingsRepository } from './systemSettings.repository.js'
import { SystemSettingsService } from './systemSettings.service.js'

function createMockRepo() {
  return {
    findByKey: vi.fn(),
    findAll: vi.fn(),
    findByCategory: vi.fn(),
    updateByKey: vi.fn(),
  } satisfies Record<keyof SystemSettingsRepository, Mock>
}

describe('SystemSettingsService', () => {
  describe('getValue()', () => {
    it('should return the typed value when the setting exists', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      const mockSetting: SystemSetting = {
        id: '1',
        key: 'app.name',
        value: 'Roxabi',
        type: 'string',
        name: 'App Name',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      mockRepo.findByKey.mockResolvedValue(mockSetting)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act
      const result = await service.getValue<string>('app.name')

      // Assert
      expect(result).toBe('Roxabi')
    })

    it('should return null when the setting does not exist', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      mockRepo.findByKey.mockResolvedValue(null)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act
      const result = await service.getValue('nonexistent')

      // Assert
      expect(result).toBeNull()
    })

    it('should query by the provided key', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      const mockSetting: SystemSetting = {
        id: '1',
        key: 'app.name',
        value: 'Roxabi',
        type: 'string',
        name: 'App Name',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      mockRepo.findByKey.mockResolvedValue(mockSetting)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act
      await service.getValue('app.name')

      // Assert — findByKey should be called with the provided key
      expect(mockRepo.findByKey).toHaveBeenCalledWith('app.name')
    })
  })

  describe('getAll()', () => {
    it('should return all settings from the database', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      const mockSettings: SystemSetting[] = [
        {
          id: '1',
          key: 'app.name',
          value: 'Roxabi',
          type: 'string',
          name: 'App Name',
          description: null,
          category: 'General',
          metadata: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          key: 'app.support_email',
          value: 'support@roxabi.com',
          type: 'string',
          name: 'Support Email',
          description: null,
          category: 'General',
          metadata: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: '3',
          key: 'email.from_name',
          value: 'Roxabi Team',
          type: 'string',
          name: 'From Name',
          description: null,
          category: 'Email',
          metadata: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      mockRepo.findAll.mockResolvedValue(mockSettings)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act
      const result = await service.getAll()

      // Assert
      expect(result).toEqual(mockSettings)
    })

    it('should return an empty array when no settings exist', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      mockRepo.findAll.mockResolvedValue([])
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act
      const result = await service.getAll()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('getByCategory()', () => {
    it('should return only settings belonging to the given category', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      const generalSettings: SystemSetting[] = [
        {
          id: '1',
          key: 'app.name',
          value: 'Roxabi',
          type: 'string',
          name: 'App Name',
          description: null,
          category: 'General',
          metadata: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          key: 'app.support_email',
          value: 'support@roxabi.com',
          type: 'string',
          name: 'Support Email',
          description: null,
          category: 'General',
          metadata: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      mockRepo.findByCategory.mockResolvedValue(generalSettings)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act
      const result = await service.getByCategory('General')

      // Assert
      expect(result).toEqual(generalSettings)
    })

    it('should return an empty array when no settings match the category', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      mockRepo.findByCategory.mockResolvedValue([])
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act
      const result = await service.getByCategory('Unknown')

      // Assert
      expect(result).toEqual([])
    })

    it('should filter by the provided category value', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      mockRepo.findByCategory.mockResolvedValue([])
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act
      await service.getByCategory('Email')

      // Assert — findByCategory should be called with the provided category
      expect(mockRepo.findByCategory).toHaveBeenCalledWith('Email')
    })
  })

  describe('batchUpdate()', () => {
    it('should read before-state, update each setting, and return updated rows with beforeState', async () => {
      // Arrange
      const existingSetting: SystemSetting = {
        id: '1',
        key: 'app.name',
        value: 'Roxabi',
        type: 'string',
        name: 'App Name',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const updatedSetting: SystemSetting = {
        ...existingSetting,
        value: 'NewName',
        updatedAt: '2026-02-01T00:00:00.000Z',
      }
      const mockRepo = createMockRepo()
      mockRepo.findByKey.mockResolvedValue(existingSetting)
      mockRepo.updateByKey.mockResolvedValue(updatedSetting)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act
      const result = await service.batchUpdate([{ key: 'app.name', value: 'NewName' }])

      // Assert
      expect(result.updated).toEqual([updatedSetting])
      expect(result.beforeState).toEqual({ 'app.name': 'Roxabi' })
    })

    it('should update multiple settings and return all before-states', async () => {
      // Arrange
      const settingA: SystemSetting = {
        id: '1',
        key: 'app.name',
        value: 'Roxabi',
        type: 'string',
        name: 'App Name',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const settingB: SystemSetting = {
        id: '2',
        key: 'app.support_email',
        value: 'old@example.com',
        type: 'string',
        name: 'Support Email',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const updatedA: SystemSetting = { ...settingA, value: 'NewApp' }
      const updatedB: SystemSetting = { ...settingB, value: 'new@example.com' }

      const mockRepo = createMockRepo()
      // Each findByKey call resolves to the respective setting
      mockRepo.findByKey.mockResolvedValueOnce(settingA).mockResolvedValueOnce(settingB)
      mockRepo.updateByKey.mockResolvedValueOnce(updatedA).mockResolvedValueOnce(updatedB)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

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
      const mockRepo = createMockRepo()
      // findByKey returns null — setting not found
      mockRepo.findByKey.mockResolvedValue(null)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act & Assert
      await expect(
        service.batchUpdate([{ key: 'nonexistent.key', value: 'value' }])
      ).rejects.toThrow(SettingNotFoundException)
    })

    it('should throw SettingValidationException when value type does not match setting type', async () => {
      // Arrange
      const numberSetting: SystemSetting = {
        id: '1',
        key: 'app.max_users',
        value: 100,
        type: 'number',
        name: 'Max Users',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const mockRepo = createMockRepo()
      mockRepo.findByKey.mockResolvedValue(numberSetting)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act & Assert — string value for a number setting should be rejected
      await expect(
        service.batchUpdate([{ key: 'app.max_users', value: 'not-a-number' }])
      ).rejects.toThrow(SettingValidationException)
    })

    it('should throw SettingValidationException when boolean setting receives non-boolean value', async () => {
      // Arrange
      const boolSetting: SystemSetting = {
        id: '1',
        key: 'app.feature_enabled',
        value: true,
        type: 'boolean',
        name: 'Feature Enabled',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const mockRepo = createMockRepo()
      mockRepo.findByKey.mockResolvedValue(boolSetting)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act & Assert
      await expect(
        service.batchUpdate([{ key: 'app.feature_enabled', value: 'yes' }])
      ).rejects.toThrow(SettingValidationException)
    })

    it('should throw SettingValidationException when select setting receives value not in options', async () => {
      // Arrange
      const selectSetting: SystemSetting = {
        id: '1',
        key: 'app.theme',
        value: 'light',
        type: 'select',
        name: 'Theme',
        description: null,
        category: 'General',
        metadata: { options: ['light', 'dark', 'system'] },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const mockRepo = createMockRepo()
      mockRepo.findByKey.mockResolvedValue(selectSetting)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act & Assert
      await expect(
        service.batchUpdate([{ key: 'app.theme', value: 'invalid-theme' }])
      ).rejects.toThrow(SettingValidationException)
    })

    it('should accept a valid string value for a string setting', async () => {
      // Arrange
      const stringSetting: SystemSetting = {
        id: '1',
        key: 'app.name',
        value: 'Roxabi',
        type: 'string',
        name: 'App Name',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const updatedSetting: SystemSetting = { ...stringSetting, value: 'NewName' }
      const mockRepo = createMockRepo()
      mockRepo.findByKey.mockResolvedValue(stringSetting)
      mockRepo.updateByKey.mockResolvedValue(updatedSetting)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act — valid string value must NOT throw
      const result = await service.batchUpdate([{ key: 'app.name', value: 'NewName' }])

      // Assert
      expect(result.updated).toEqual([updatedSetting])
    })

    it('should accept a valid number value for a number setting', async () => {
      // Arrange
      const numberSetting: SystemSetting = {
        id: '1',
        key: 'app.max_users',
        value: 100,
        type: 'number',
        name: 'Max Users',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const updatedSetting: SystemSetting = { ...numberSetting, value: 200 }
      const mockRepo = createMockRepo()
      mockRepo.findByKey.mockResolvedValue(numberSetting)
      mockRepo.updateByKey.mockResolvedValue(updatedSetting)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act — valid number value must NOT throw
      const result = await service.batchUpdate([{ key: 'app.max_users', value: 200 }])

      // Assert
      expect(result.updated).toEqual([updatedSetting])
    })

    it('should throw SettingValidationException when number setting receives NaN', async () => {
      // Arrange
      const numberSetting: SystemSetting = {
        id: '1',
        key: 'app.max_users',
        value: 100,
        type: 'number',
        name: 'Max Users',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const mockRepo = createMockRepo()
      mockRepo.findByKey.mockResolvedValue(numberSetting)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act & Assert — NaN is typeof 'number' but should still be rejected
      await expect(
        service.batchUpdate([{ key: 'app.max_users', value: Number.NaN }])
      ).rejects.toThrow(SettingValidationException)
    })

    it('should accept a valid boolean value for a boolean setting', async () => {
      // Arrange
      const boolSetting: SystemSetting = {
        id: '1',
        key: 'app.feature_enabled',
        value: true,
        type: 'boolean',
        name: 'Feature Enabled',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const updatedSetting: SystemSetting = { ...boolSetting, value: false }
      const mockRepo = createMockRepo()
      mockRepo.findByKey.mockResolvedValue(boolSetting)
      mockRepo.updateByKey.mockResolvedValue(updatedSetting)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act — valid boolean value must NOT throw
      const result = await service.batchUpdate([{ key: 'app.feature_enabled', value: false }])

      // Assert
      expect(result.updated).toEqual([updatedSetting])
    })

    it('should accept a valid option value for a select setting', async () => {
      // Arrange
      const selectSetting: SystemSetting = {
        id: '1',
        key: 'app.theme',
        value: 'light',
        type: 'select',
        name: 'Theme',
        description: null,
        category: 'General',
        metadata: { options: ['light', 'dark', 'system'] },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const updatedSetting: SystemSetting = { ...selectSetting, value: 'dark' }
      const mockRepo = createMockRepo()
      mockRepo.findByKey.mockResolvedValue(selectSetting)
      mockRepo.updateByKey.mockResolvedValue(updatedSetting)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act — valid option in the options list must NOT throw
      const result = await service.batchUpdate([{ key: 'app.theme', value: 'dark' }])

      // Assert
      expect(result.updated).toEqual([updatedSetting])
    })

    it('should return empty updated array and empty beforeState for empty updates array', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act
      const result = await service.batchUpdate([])

      // Assert — no-op: no DB reads or writes
      expect(result.updated).toEqual([])
      expect(result.beforeState).toEqual({})
      expect(mockRepo.findByKey).not.toHaveBeenCalled()
      expect(mockRepo.updateByKey).not.toHaveBeenCalled()
    })

    it('should reject entire batch before any updates when first update has invalid type', async () => {
      // Arrange — first setting is number type, receives string value
      const numberSetting: SystemSetting = {
        id: '1',
        key: 'app.max_users',
        value: 100,
        type: 'number',
        name: 'Max Users',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const mockRepo = createMockRepo()
      mockRepo.findByKey.mockResolvedValue(numberSetting)
      const service = new SystemSettingsService(mockRepo as SystemSettingsRepository)

      // Act & Assert
      await expect(
        service.batchUpdate([
          { key: 'app.max_users', value: 'oops' },
          { key: 'app.name', value: 'Valid Value' },
        ])
      ).rejects.toThrow(SettingValidationException)

      // Assert — no updates should have been written to the database
      expect(mockRepo.updateByKey).not.toHaveBeenCalled()
    })
  })
})
