import { Reflector } from '@nestjs/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditService } from '../audit/audit.service.js'
import type { FeatureFlagService } from '../feature-flags/featureFlags.service.js'
import { AdminFeatureFlagsController } from './adminFeatureFlags.controller.js'
import { FeatureFlagCreateFailedException } from './exceptions/featureFlagCreateFailed.exception.js'
import { FlagKeyConflictException } from './exceptions/flagKeyConflict.exception.js'
import { FlagNotFoundException } from './exceptions/flagNotFound.exception.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFeatureFlagService: FeatureFlagService = {
  isEnabled: vi.fn(),
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as unknown as FeatureFlagService

const mockAuditService: AuditService = {
  log: vi.fn(),
} as unknown as AuditService

function createFlag(
  overrides: Partial<{
    id: string
    name: string
    key: string
    description: string | null
    enabled: boolean
    createdAt: string
    updatedAt: string
  }> = {}
) {
  return {
    id: overrides.id ?? 'flag-1',
    name: overrides.name ?? 'My Flag',
    key: overrides.key ?? 'my-flag',
    description: overrides.description ?? null,
    enabled: overrides.enabled ?? false,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00Z',
  }
}

const mockSession = {
  user: { id: 'superadmin-1' },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminFeatureFlagsController', () => {
  const controller = new AdminFeatureFlagsController(mockFeatureFlagService, mockAuditService)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Decorator verification
  // -------------------------------------------------------------------------
  it('should use @Roles(superadmin) and @SkipOrg() on the controller class', () => {
    // Arrange
    const reflector = new Reflector()

    // Act
    const roles = reflector.get('ROLES', AdminFeatureFlagsController)
    const skipOrg = reflector.get('SKIP_ORG', AdminFeatureFlagsController)

    // Assert
    expect(roles).toEqual(['superadmin'])
    expect(skipOrg).toBe(true)
  })

  // -------------------------------------------------------------------------
  // GET /api/admin/feature-flags
  // -------------------------------------------------------------------------
  describe('getAll()', () => {
    it('should return all flags from the service', async () => {
      // Arrange
      const flags = [createFlag({ id: 'flag-1' }), createFlag({ id: 'flag-2', key: 'other-flag' })]
      vi.mocked(mockFeatureFlagService.getAll).mockResolvedValue(flags as never)

      // Act
      const result = await controller.getAll()

      // Assert
      expect(mockFeatureFlagService.getAll).toHaveBeenCalledOnce()
      expect(result).toEqual(flags)
    })

    it('should return empty array when no flags exist', async () => {
      // Arrange
      vi.mocked(mockFeatureFlagService.getAll).mockResolvedValue([])

      // Act
      const result = await controller.getAll()

      // Assert
      expect(result).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // POST /api/admin/feature-flags
  // -------------------------------------------------------------------------
  describe('create()', () => {
    it('should create flag with valid data and log audit', async () => {
      // Arrange
      const body = { name: 'My Flag', key: 'my-flag', description: 'A test flag' }
      const created = createFlag({ id: 'flag-new', ...body })
      vi.mocked(mockFeatureFlagService.create).mockResolvedValue(created as never)

      // Act
      const result = await controller.create(mockSession as never, body)

      // Assert
      expect(mockFeatureFlagService.create).toHaveBeenCalledWith(body)
      expect(mockAuditService.log).toHaveBeenCalledOnce()
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'superadmin-1',
          actorType: 'user',
          action: 'flag.created',
          resource: 'feature_flag',
          resourceId: 'flag-new',
          after: created,
        })
      )
      expect(result).toEqual(created)
    })

    it('should create flag without optional description', async () => {
      // Arrange
      const body = { name: 'Simple Flag', key: 'simple-flag' }
      const created = createFlag({ id: 'flag-simple', ...body })
      vi.mocked(mockFeatureFlagService.create).mockResolvedValue(created as never)

      // Act
      const result = await controller.create(mockSession as never, body)

      // Assert
      expect(mockFeatureFlagService.create).toHaveBeenCalledWith(body)
      expect(result).toEqual(created)
    })

    it('should throw FeatureFlagCreateFailedException when service returns null', async () => {
      // Arrange
      const body = { name: 'Ghost Flag', key: 'ghost-flag' }
      vi.mocked(mockFeatureFlagService.create).mockResolvedValue(null as never)

      // Act & Assert
      await expect(controller.create(mockSession as never, body)).rejects.toThrow(
        FeatureFlagCreateFailedException
      )
      expect(mockAuditService.log).not.toHaveBeenCalled()
    })

    it('should throw FlagKeyConflictException when service throws unique constraint error', async () => {
      // Arrange
      const body = { name: 'Duplicate', key: 'existing-flag' }
      const dbError = Object.assign(new Error('duplicate key value'), { code: '23505' })
      vi.mocked(mockFeatureFlagService.create).mockRejectedValue(dbError)

      // Act & Assert
      await expect(controller.create(mockSession as never, body)).rejects.toThrow(
        FlagKeyConflictException
      )
      expect(mockAuditService.log).not.toHaveBeenCalled()
    })

    it('should propagate unexpected errors from the service', async () => {
      // Arrange
      const body = { name: 'My Flag', key: 'my-flag' }
      const unexpected = new Error('DB connection lost')
      vi.mocked(mockFeatureFlagService.create).mockRejectedValue(unexpected)

      // Act & Assert
      await expect(controller.create(mockSession as never, body)).rejects.toThrow(
        'DB connection lost'
      )
    })
  })

  // -------------------------------------------------------------------------
  // PATCH /api/admin/feature-flags/:id
  // -------------------------------------------------------------------------
  describe('update()', () => {
    it('should update flag and log audit with before/after when name changes', async () => {
      // Arrange
      const id = 'flag-1'
      const before = createFlag({ id, name: 'Old Name', key: 'my-flag', enabled: false })
      const after = createFlag({ id, name: 'New Name', key: 'my-flag', enabled: false })
      const body = { name: 'New Name' }
      vi.mocked(mockFeatureFlagService.getById).mockResolvedValue(before as never)
      vi.mocked(mockFeatureFlagService.update).mockResolvedValue(after as never)

      // Act
      const result = await controller.update(mockSession as never, id, body)

      // Assert
      expect(mockFeatureFlagService.update).toHaveBeenCalledWith(id, body)
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'superadmin-1',
          action: 'flag.updated',
          resource: 'feature_flag',
          resourceId: id,
          before,
          after,
        })
      )
      expect(result).toEqual(after)
    })

    it('should use flag.toggled action when only enabled changes', async () => {
      // Arrange
      const id = 'flag-1'
      const before = createFlag({ id, enabled: false })
      const after = createFlag({ id, enabled: true })
      const body = { enabled: true }
      vi.mocked(mockFeatureFlagService.getById).mockResolvedValue(before as never)
      vi.mocked(mockFeatureFlagService.update).mockResolvedValue(after as never)

      // Act
      await controller.update(mockSession as never, id, body)

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'flag.toggled' })
      )
    })

    it('should use flag.updated action when enabled and name both change', async () => {
      // Arrange
      const id = 'flag-1'
      const before = createFlag({ id, enabled: false })
      const after = createFlag({ id, enabled: true, name: 'Renamed' })
      const body = { enabled: true, name: 'Renamed' }
      vi.mocked(mockFeatureFlagService.getById).mockResolvedValue(before as never)
      vi.mocked(mockFeatureFlagService.update).mockResolvedValue(after as never)

      // Act
      await controller.update(mockSession as never, id, body)

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'flag.updated' })
      )
    })

    it('should use flag.updated action when name changes (not enabled)', async () => {
      // Arrange
      const id = 'flag-1'
      const before = createFlag({ id })
      const after = createFlag({ id, name: 'Updated' })
      const body = { name: 'Updated' }
      vi.mocked(mockFeatureFlagService.getById).mockResolvedValue(before as never)
      vi.mocked(mockFeatureFlagService.update).mockResolvedValue(after as never)

      // Act
      await controller.update(mockSession as never, id, body)

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'flag.updated' })
      )
    })

    it('should throw FlagNotFoundException when flag does not exist', async () => {
      // Arrange
      const id = 'nonexistent-id'
      vi.mocked(mockFeatureFlagService.getById).mockResolvedValue(undefined as never)

      // Act & Assert
      await expect(controller.update(mockSession as never, id, { name: 'X' })).rejects.toThrow(
        FlagNotFoundException
      )
      expect(mockFeatureFlagService.update).not.toHaveBeenCalled()
      expect(mockAuditService.log).not.toHaveBeenCalled()
    })

    it('should throw FlagNotFoundException when service update returns null', async () => {
      // Arrange
      const id = 'flag-1'
      const before = createFlag({ id })
      vi.mocked(mockFeatureFlagService.getById).mockResolvedValue(before as never)
      vi.mocked(mockFeatureFlagService.update).mockResolvedValue(undefined as never)

      // Act & Assert
      await expect(controller.update(mockSession as never, id, { name: 'X' })).rejects.toThrow(
        FlagNotFoundException
      )
      expect(mockAuditService.log).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // DELETE /api/admin/feature-flags/:id
  // -------------------------------------------------------------------------
  describe('delete()', () => {
    it('should delete flag and log audit with before state', async () => {
      // Arrange
      const id = 'flag-1'
      const existing = createFlag({ id })
      vi.mocked(mockFeatureFlagService.getById).mockResolvedValue(existing as never)
      vi.mocked(mockFeatureFlagService.delete).mockResolvedValue(undefined)

      // Act
      const result = await controller.delete(mockSession as never, id)

      // Assert
      expect(mockFeatureFlagService.delete).toHaveBeenCalledWith(id)
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'superadmin-1',
          actorType: 'user',
          action: 'flag.deleted',
          resource: 'feature_flag',
          resourceId: id,
          before: existing,
        })
      )
      expect(result).toBeUndefined()
    })

    it('should throw FlagNotFoundException when flag does not exist', async () => {
      // Arrange
      const id = 'nonexistent-id'
      vi.mocked(mockFeatureFlagService.getById).mockResolvedValue(undefined as never)

      // Act & Assert
      await expect(controller.delete(mockSession as never, id)).rejects.toThrow(
        FlagNotFoundException
      )
      expect(mockFeatureFlagService.delete).not.toHaveBeenCalled()
      expect(mockAuditService.log).not.toHaveBeenCalled()
    })
  })
})
