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
    it('should return the row when found', async () => {
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([mockRow])
      const repo = new DrizzleSystemSettingsRepository(db as never)

      const result = await repo.findByKey('app.name')

      expect(result).toEqual(mockRow)
      expect(chains.select.limit).toHaveBeenCalledWith(1)
    })

    it('should return null when not found', async () => {
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([])
      const repo = new DrizzleSystemSettingsRepository(db as never)

      const result = await repo.findByKey('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should return all settings', async () => {
      const { db, chains } = createMockDb()
      // findAll uses select().from() — no where/limit
      chains.select.from.mockResolvedValue([mockRow])
      const repo = new DrizzleSystemSettingsRepository(db as never)

      const result = await repo.findAll()

      expect(result).toEqual([mockRow])
    })
  })

  describe('findByCategory', () => {
    it('should return settings for the given category', async () => {
      const { db, chains } = createMockDb()
      // findByCategory uses select().from().where() — no limit
      chains.select.where.mockResolvedValue([mockRow])
      const repo = new DrizzleSystemSettingsRepository(db as never)

      const result = await repo.findByCategory('General')

      expect(result).toEqual([mockRow])
    })
  })

  describe('updateByKey', () => {
    it('should update and return the row', async () => {
      const { db, chains } = createMockDb()
      const updated = { ...mockRow, value: 'NewName' }
      chains.update.returning.mockResolvedValue([updated])
      const repo = new DrizzleSystemSettingsRepository(db as never)

      const result = await repo.updateByKey('app.name', 'NewName')

      expect(result).toEqual(updated)
      expect(db.update).toHaveBeenCalled()
    })

    it('should return null when key not found', async () => {
      const { db, chains } = createMockDb()
      chains.update.returning.mockResolvedValue([])
      const repo = new DrizzleSystemSettingsRepository(db as never)

      const result = await repo.updateByKey('nonexistent', 'value')

      expect(result).toBeNull()
    })
  })
})
