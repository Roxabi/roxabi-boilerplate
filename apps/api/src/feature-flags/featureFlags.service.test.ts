import type { FeatureFlag } from '@repo/types'
import type { Mock } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeatureFlagRepository } from './featureFlags.repository.js'
import { FeatureFlagService } from './featureFlags.service.js'

function createMockRepo() {
  return {
    findByKey: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } satisfies Record<keyof FeatureFlagRepository, Mock>
}

const mockFlag: FeatureFlag = {
  id: 'flag-1',
  key: 'new-dashboard',
  name: 'New Dashboard',
  description: null,
  enabled: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('FeatureFlagService', () => {
  let mockRepo: ReturnType<typeof createMockRepo>
  let service: FeatureFlagService

  beforeEach(() => {
    mockRepo = createMockRepo()
    service = new FeatureFlagService(mockRepo as FeatureFlagRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('isEnabled()', () => {
    it('should return true when the flag exists and is enabled', async () => {
      // Arrange
      mockRepo.findByKey.mockResolvedValue({ ...mockFlag, enabled: true })

      // Act
      const result = await service.isEnabled('new-dashboard')

      // Assert
      expect(result).toBe(true)
    })

    it('should return false when the flag exists but is disabled', async () => {
      // Arrange
      mockRepo.findByKey.mockResolvedValue({ ...mockFlag, enabled: false })

      // Act
      const result = await service.isEnabled('new-dashboard')

      // Assert
      expect(result).toBe(false)
    })

    it('should return false when the flag does not exist in the database', async () => {
      // Arrange
      mockRepo.findByKey.mockResolvedValue(null)

      // Act
      const result = await service.isEnabled('unknown-flag')

      // Assert
      expect(result).toBe(false)
    })

    it('should return cached value on second call within 60s without querying DB again', async () => {
      // Arrange
      mockRepo.findByKey.mockResolvedValue({ ...mockFlag, key: 'beta-mode', enabled: true })

      // Act — call twice in quick succession
      const first = await service.isEnabled('beta-mode')
      const second = await service.isEnabled('beta-mode')

      // Assert — repo queried only once
      expect(first).toBe(true)
      expect(second).toBe(true)
      expect(mockRepo.findByKey).toHaveBeenCalledOnce()
    })

    it('should query the DB again after the 60s cache TTL expires', async () => {
      // Arrange
      const nowSpy = vi.spyOn(Date, 'now')
      const baseTime = 1_700_000_000_000
      nowSpy.mockReturnValue(baseTime)

      mockRepo.findByKey.mockResolvedValueOnce({ ...mockFlag, key: 'beta-mode', enabled: true })

      // First call — populates cache at baseTime
      await service.isEnabled('beta-mode')

      // Advance clock past 60s
      nowSpy.mockReturnValue(baseTime + 61_000)

      // Second repo response after TTL expiry
      mockRepo.findByKey.mockResolvedValueOnce({ ...mockFlag, key: 'beta-mode', enabled: false })

      // Act — second call after expiry
      const result = await service.isEnabled('beta-mode')

      // Assert — fresh repo query, new value returned
      expect(result).toBe(false)
      expect(mockRepo.findByKey).toHaveBeenCalledTimes(2)

      nowSpy.mockRestore()
    })
  })

  describe('cache invalidation', () => {
    it('should clear the cache for a key after update() so next isEnabled() reads from DB', async () => {
      // Arrange
      mockRepo.findByKey.mockResolvedValue({ ...mockFlag, key: 'beta-mode', enabled: true })
      mockRepo.update.mockResolvedValue({ ...mockFlag, key: 'beta-mode', enabled: true })

      // Populate cache
      await service.isEnabled('beta-mode')
      expect(mockRepo.findByKey).toHaveBeenCalledOnce()

      // Act — update should clear the cache entry
      await service.update('flag-1', { enabled: true })

      // Call isEnabled again — must hit repo a second time
      await service.isEnabled('beta-mode')

      // Assert
      expect(mockRepo.findByKey).toHaveBeenCalledTimes(2)
    })

    it('should clear the cache for a key after create() so next isEnabled() reads from DB', async () => {
      // Arrange
      mockRepo.findByKey.mockResolvedValue({ ...mockFlag, key: 'new-feature', enabled: true })
      mockRepo.create.mockResolvedValue({ ...mockFlag, key: 'new-feature', enabled: false })

      // Populate cache
      await service.isEnabled('new-feature')
      expect(mockRepo.findByKey).toHaveBeenCalledOnce()

      // Act — create should clear the cache entry
      await service.create({ name: 'New Feature', key: 'new-feature' })

      // Call isEnabled again — must hit repo a second time
      await service.isEnabled('new-feature')

      // Assert
      expect(mockRepo.findByKey).toHaveBeenCalledTimes(2)
    })

    it('should clear the cache for a key after delete()', async () => {
      // Arrange
      mockRepo.findByKey
        .mockResolvedValueOnce({ ...mockFlag, key: 'old-feature', enabled: true })
        .mockResolvedValueOnce(null)
      mockRepo.delete.mockResolvedValue({ ...mockFlag, id: 'flag-2', key: 'old-feature' })

      // Populate cache
      await service.isEnabled('old-feature')
      expect(mockRepo.findByKey).toHaveBeenCalledOnce()

      // Act — delete should clear the cache entry
      await service.delete('flag-2')

      // Call isEnabled again — must hit repo a second time
      const result = await service.isEnabled('old-feature')

      // Assert
      expect(mockRepo.findByKey).toHaveBeenCalledTimes(2)
      expect(result).toBe(false)
    })
  })

  describe('getAll()', () => {
    it('should return all flags ordered by createdAt DESC', async () => {
      // Arrange
      const mockFlags: FeatureFlag[] = [
        {
          id: 'flag-2',
          key: 'beta-mode',
          name: 'Beta Mode',
          description: null,
          enabled: true,
          createdAt: '2024-02-01T00:00:00.000Z',
          updatedAt: '2024-02-01T00:00:00.000Z',
        },
        {
          ...mockFlag,
          id: 'flag-1',
          key: 'new-dashboard',
          name: 'New Dashboard',
          enabled: false,
        },
      ]
      mockRepo.findAll.mockResolvedValue(mockFlags)

      // Act
      const result = await service.getAll()

      // Assert
      expect(result).toEqual(mockFlags)
      expect(result).toHaveLength(2)
    })

    it('should return an empty array when no flags exist', async () => {
      // Arrange
      mockRepo.findAll.mockResolvedValue([])

      // Act
      const result = await service.getAll()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('create()', () => {
    it('should insert a new flag and return the created record', async () => {
      // Arrange
      const newFlag: FeatureFlag = {
        id: 'flag-3',
        key: 'dark-mode',
        name: 'Dark Mode',
        description: 'Enable dark mode UI',
        enabled: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }
      mockRepo.create.mockResolvedValue(newFlag)
      const input = { name: 'Dark Mode', key: 'dark-mode', description: 'Enable dark mode UI' }

      // Act
      const result = await service.create(input)

      // Assert
      expect(result).toEqual(newFlag)
      expect(mockRepo.create).toHaveBeenCalledOnce()
      expect(mockRepo.create).toHaveBeenCalledWith(input)
    })

    it('should create a flag without an optional description', async () => {
      // Arrange
      const newFlag: FeatureFlag = {
        id: 'flag-4',
        key: 'no-desc',
        name: 'No Description',
        description: null,
        enabled: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }
      mockRepo.create.mockResolvedValue(newFlag)

      // Act
      const result = await service.create({ name: 'No Description', key: 'no-desc' })

      // Assert
      expect(result).toEqual(newFlag)
    })
  })

  describe('update()', () => {
    it('should update flag fields and return the updated record', async () => {
      // Arrange
      const updatedFlag: FeatureFlag = { ...mockFlag, enabled: true }
      mockRepo.update.mockResolvedValue(updatedFlag)

      // Act
      const result = await service.update('flag-1', { enabled: true })

      // Assert
      expect(result).toEqual(updatedFlag)
      expect(mockRepo.update).toHaveBeenCalledOnce()
      expect(mockRepo.update).toHaveBeenCalledWith('flag-1', { enabled: true })
    })

    it('should allow updating only the name', async () => {
      // Arrange
      const updatedFlag: FeatureFlag = { ...mockFlag, name: 'Renamed Dashboard', enabled: false }
      mockRepo.update.mockResolvedValue(updatedFlag)

      // Act
      const result = await service.update('flag-1', { name: 'Renamed Dashboard' })

      // Assert
      expect(result).toEqual(updatedFlag)
    })
  })

  describe('delete()', () => {
    it('should remove the flag from the database', async () => {
      // Arrange
      mockRepo.delete.mockResolvedValue(mockFlag)

      // Act
      await service.delete('flag-1')

      // Assert
      expect(mockRepo.delete).toHaveBeenCalledOnce()
      expect(mockRepo.delete).toHaveBeenCalledWith('flag-1')
    })

    it('should resolve without error even when the flag does not exist', async () => {
      // Arrange
      mockRepo.delete.mockResolvedValue(null)

      // Act & Assert — should not throw
      await expect(service.delete('nonexistent-id')).resolves.toBeUndefined()
    })
  })
})
