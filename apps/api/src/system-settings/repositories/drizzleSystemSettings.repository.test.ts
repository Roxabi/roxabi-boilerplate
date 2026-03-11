import { describe, expect, it, vi } from 'vitest'
import { DrizzleSystemSettingsRepository } from './drizzleSystemSettings.repository.js'

const mockRow = {
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

const expectedSetting = {
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

function createMockDb() {
  const limitFn = vi.fn()
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn })
  const fromFn = vi.fn().mockReturnValue({ where: whereFn })
  const selectFn = vi.fn().mockReturnValue({ from: fromFn })

  const returningFn = vi.fn()
  const updateWhereFn = vi.fn().mockReturnValue({ returning: returningFn })
  const setFn = vi.fn().mockReturnValue({ where: updateWhereFn })
  const updateFn = vi.fn().mockReturnValue({ set: setFn })

  return {
    db: { select: selectFn, update: updateFn },
    chains: {
      select: { from: fromFn, where: whereFn, limit: limitFn },
      update: { set: setFn, where: updateWhereFn, returning: returningFn },
    },
  }
}

describe('DrizzleSystemSettingsRepository', () => {
  describe('findByKey', () => {
    it('should return mapped domain type when found', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([mockRow])
      const repo = new DrizzleSystemSettingsRepository(db as never)

      // Act
      const result = await repo.findByKey('app.name')

      // Assert
      expect(result).toEqual(expectedSetting)
      expect(chains.select.limit).toHaveBeenCalledWith(1)
    })

    it('should return null when not found', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([])
      const repo = new DrizzleSystemSettingsRepository(db as never)

      // Act
      const result = await repo.findByKey('nonexistent')

      // Assert
      expect(result).toBeNull()
    })

    it('should map non-null description and metadata', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([
        {
          ...mockRow,
          description: 'App display name',
          metadata: { options: ['light', 'dark'] },
        },
      ])
      const repo = new DrizzleSystemSettingsRepository(db as never)

      // Act
      const result = await repo.findByKey('app.name')

      // Assert
      expect(result?.description).toBe('App display name')
      expect(result?.metadata).toEqual({ options: ['light', 'dark'] })
    })
  })

  describe('findAll', () => {
    it('should return all settings mapped to domain types', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      // findAll uses select().from() — no where/limit
      chains.select.from.mockResolvedValue([mockRow])
      const repo = new DrizzleSystemSettingsRepository(db as never)

      // Act
      const result = await repo.findAll()

      // Assert
      expect(result).toEqual([expectedSetting])
    })
  })

  describe('findByCategory', () => {
    it('should return settings for the given category mapped to domain types', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      // findByCategory uses select().from().where() — no limit
      chains.select.where.mockResolvedValue([mockRow])
      const repo = new DrizzleSystemSettingsRepository(db as never)

      // Act
      const result = await repo.findByCategory('General')

      // Assert
      expect(result).toEqual([expectedSetting])
      expect(chains.select.where).toHaveBeenCalled()
    })
  })

  describe('updateByKey', () => {
    it('should update and return mapped domain type', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      const updatedRow = { ...mockRow, value: 'NewName' }
      chains.update.returning.mockResolvedValue([updatedRow])
      const repo = new DrizzleSystemSettingsRepository(db as never)

      // Act
      const result = await repo.updateByKey('app.name', 'NewName')

      // Assert
      expect(result).toEqual({ ...expectedSetting, value: 'NewName' })
      expect(db.update).toHaveBeenCalled()
    })

    it('should return null when key not found', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      chains.update.returning.mockResolvedValue([])
      const repo = new DrizzleSystemSettingsRepository(db as never)

      // Act
      const result = await repo.updateByKey('nonexistent', 'value')

      // Assert
      expect(result).toBeNull()
    })
  })
})
