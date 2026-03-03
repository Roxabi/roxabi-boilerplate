import { Reflector } from '@nestjs/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditService } from '../audit/audit.service.js'
import { SettingNotFoundException } from '../system-settings/exceptions/settingNotFound.exception.js'
import { SettingValidationException } from '../system-settings/exceptions/settingValidation.exception.js'
import type { SystemSettingsService } from '../system-settings/systemSettings.service.js'
import { AdminSettingsController, settingsUpdateSchema } from './adminSettings.controller.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockSystemSettingsService: SystemSettingsService = {
  getAll: vi.fn(),
  getValue: vi.fn(),
  getByCategory: vi.fn(),
  batchUpdate: vi.fn(),
} as unknown as SystemSettingsService

const mockAuditService: AuditService = {
  log: vi.fn(),
} as unknown as AuditService

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminSettingsController', () => {
  const controller = new AdminSettingsController(mockSystemSettingsService, mockAuditService)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockSession = {
    user: { id: 'superadmin-1' },
  }

  // -----------------------------------------------------------------------
  // Decorator verification
  // -----------------------------------------------------------------------
  it('should use @Roles(superadmin) and @SkipOrg() on the controller class', () => {
    // Arrange
    const reflector = new Reflector()

    // Act
    const roles = reflector.get('ROLES', AdminSettingsController)
    const skipOrg = reflector.get('SKIP_ORG', AdminSettingsController)

    // Assert
    expect(roles).toEqual(['superadmin'])
    expect(skipOrg).toBe(true)
  })

  // -----------------------------------------------------------------------
  // GET /api/admin/settings
  // -----------------------------------------------------------------------
  describe('GET /api/admin/settings', () => {
    it('should delegate to service.getAll() and group results by category', async () => {
      // Arrange
      const allSettings = [
        {
          id: '1',
          key: 'app.name',
          value: 'Roxabi',
          type: 'string',
          name: 'App Name',
          description: null,
          category: 'General',
          metadata: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
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
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
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
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ]
      vi.mocked(mockSystemSettingsService.getAll).mockResolvedValue(allSettings as never)

      // Act
      const result = await controller.getSettings()

      // Assert
      expect(mockSystemSettingsService.getAll).toHaveBeenCalledOnce()
      expect(result).toEqual({
        General: [allSettings[0], allSettings[1]],
        Email: [allSettings[2]],
      })
    })

    it('should return an empty object when no settings exist', async () => {
      // Arrange
      vi.mocked(mockSystemSettingsService.getAll).mockResolvedValue([])

      // Act
      const result = await controller.getSettings()

      // Assert
      expect(result).toEqual({})
    })
  })

  // -----------------------------------------------------------------------
  // PATCH /api/admin/settings
  // -----------------------------------------------------------------------
  describe('PATCH /api/admin/settings', () => {
    it('should call service.batchUpdate() and audit each changed setting', async () => {
      // Arrange
      const updates = [
        { key: 'app.name', value: 'NewName' },
        { key: 'app.support_email', value: 'new@example.com' },
      ]
      const updatedSettings = [
        {
          id: '1',
          key: 'app.name',
          value: 'NewName',
          type: 'string',
          name: 'App Name',
          description: null,
          category: 'General',
          metadata: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
        {
          id: '2',
          key: 'app.support_email',
          value: 'new@example.com',
          type: 'string',
          name: 'Support Email',
          description: null,
          category: 'General',
          metadata: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ]
      const beforeState = {
        'app.name': 'Roxabi',
        'app.support_email': 'support@roxabi.com',
      }
      vi.mocked(mockSystemSettingsService.batchUpdate).mockResolvedValue({
        updated: updatedSettings,
        beforeState,
      } as never)
      vi.mocked(mockAuditService.log).mockResolvedValue(undefined)

      // Act
      const result = await controller.updateSettings(mockSession as never, { updates })

      // Assert
      expect(mockSystemSettingsService.batchUpdate).toHaveBeenCalledWith(updates)
      expect(mockAuditService.log).toHaveBeenCalledTimes(2)
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'superadmin-1',
          action: 'settings.updated',
          resource: 'system_setting',
          resourceId: 'app.name',
        })
      )
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'superadmin-1',
          action: 'settings.updated',
          resource: 'system_setting',
          resourceId: 'app.support_email',
        })
      )
      expect(result).toEqual(updatedSettings)
    })

    it('should return updated settings array from service', async () => {
      // Arrange
      const updates = [{ key: 'app.name', value: 'MyApp' }]
      const updatedSetting = {
        id: '1',
        key: 'app.name',
        value: 'MyApp',
        type: 'string',
        name: 'App Name',
        description: null,
        category: 'General',
        metadata: null,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      }
      vi.mocked(mockSystemSettingsService.batchUpdate).mockResolvedValue({
        updated: [updatedSetting],
        beforeState: { 'app.name': 'Roxabi' },
      } as never)
      vi.mocked(mockAuditService.log).mockResolvedValue(undefined)

      // Act
      const result = await controller.updateSettings(mockSession as never, { updates })

      // Assert
      expect(result).toEqual([updatedSetting])
    })

    it('should propagate SettingValidationException when service throws it', async () => {
      // Arrange
      const updates = [{ key: 'app.max_users', value: 'not-a-number' }]
      vi.mocked(mockSystemSettingsService.batchUpdate).mockRejectedValue(
        new SettingValidationException('app.max_users', 'number', 'string')
      )

      // Act & Assert
      await expect(controller.updateSettings(mockSession as never, { updates })).rejects.toThrow(
        SettingValidationException
      )
    })

    it('should propagate SettingNotFoundException when service throws it', async () => {
      // Arrange
      const updates = [{ key: 'nonexistent.key', value: 'value' }]
      vi.mocked(mockSystemSettingsService.batchUpdate).mockRejectedValue(
        new SettingNotFoundException('nonexistent.key')
      )

      // Act & Assert
      await expect(controller.updateSettings(mockSession as never, { updates })).rejects.toThrow(
        SettingNotFoundException
      )
    })

    it('should not call auditService.log when service throws', async () => {
      // Arrange
      const updates = [{ key: 'app.name', value: 'NewName' }]
      vi.mocked(mockSystemSettingsService.batchUpdate).mockRejectedValue(
        new SettingNotFoundException('app.name')
      )

      // Act & Assert
      await expect(controller.updateSettings(mockSession as never, { updates })).rejects.toThrow(
        SettingNotFoundException
      )
      expect(mockAuditService.log).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // PATCH /api/admin/settings — Zod schema validation
  // -----------------------------------------------------------------------
  describe('settingsUpdateSchema validation', () => {
    it('should accept a valid updates array with key and value', () => {
      // Arrange
      const input = { updates: [{ key: 'app.name', value: 'MyApp' }] }

      // Act
      const result = settingsUpdateSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    it('should accept multiple updates', () => {
      // Arrange
      const input = {
        updates: [
          { key: 'app.name', value: 'MyApp' },
          { key: 'app.max_users', value: 100 },
          { key: 'app.enabled', value: true },
        ],
      }

      // Act
      const result = settingsUpdateSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    it('should accept values of any type (string, number, boolean)', () => {
      // Arrange
      const stringInput = { updates: [{ key: 'app.name', value: 'test' }] }
      const numberInput = { updates: [{ key: 'app.limit', value: 42 }] }
      const boolInput = { updates: [{ key: 'app.enabled', value: false }] }

      // Act & Assert
      expect(settingsUpdateSchema.safeParse(stringInput).success).toBe(true)
      expect(settingsUpdateSchema.safeParse(numberInput).success).toBe(true)
      expect(settingsUpdateSchema.safeParse(boolInput).success).toBe(true)
    })

    it('should reject empty updates array', () => {
      // Arrange
      const input = { updates: [] }

      // Act
      const result = settingsUpdateSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    it('should reject update with missing key', () => {
      // Arrange
      const input = { updates: [{ value: 'something' }] }

      // Act
      const result = settingsUpdateSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    it('should reject update with missing value', () => {
      // Arrange
      const input = { updates: [{ key: 'app.name' }] }

      // Act
      const result = settingsUpdateSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    it('should reject missing updates field entirely', () => {
      // Arrange
      const input = {}

      // Act
      const result = settingsUpdateSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    it('should reject update with empty key string', () => {
      // Arrange
      const input = { updates: [{ key: '', value: 'test' }] }

      // Act
      const result = settingsUpdateSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })
})
