import { describe, expect, it, vi } from 'vitest'
import { DrizzleFeatureFlagRepository } from './drizzleFeatureFlags.repository.js'

const mockRow = {
  id: 'flag-1',
  key: 'new-dashboard',
  name: 'New Dashboard',
  description: null,
  enabled: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

function createMockDb() {
  const limitFn = vi.fn()
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn })
  const orderByFn = vi.fn()
  const fromFn = vi.fn().mockReturnValue({ where: whereFn, orderBy: orderByFn })
  const selectFn = vi.fn().mockReturnValue({ from: fromFn })

  const returningFn = vi.fn()
  const insertValuesFn = vi.fn().mockReturnValue({ returning: returningFn })
  const insertFn = vi.fn().mockReturnValue({ values: insertValuesFn })

  const updateReturningFn = vi.fn()
  const updateWhereFn = vi.fn().mockReturnValue({ returning: updateReturningFn })
  const setFn = vi.fn().mockReturnValue({ where: updateWhereFn })
  const updateFn = vi.fn().mockReturnValue({ set: setFn })

  const deleteReturningFn = vi.fn()
  const deleteWhereFn = vi.fn().mockReturnValue({ returning: deleteReturningFn })
  const deleteFn = vi.fn().mockReturnValue({ where: deleteWhereFn })

  return {
    db: { select: selectFn, insert: insertFn, update: updateFn, delete: deleteFn },
    chains: {
      select: { from: fromFn, where: whereFn, limit: limitFn, orderBy: orderByFn },
      insert: { values: insertValuesFn, returning: returningFn },
      update: { set: setFn, where: updateWhereFn, returning: updateReturningFn },
      delete: { where: deleteWhereFn, returning: deleteReturningFn },
    },
  }
}

describe('DrizzleFeatureFlagRepository', () => {
  describe('findByKey', () => {
    it('should return the row when found', async () => {
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([mockRow])
      const repo = new DrizzleFeatureFlagRepository(db as never)

      const result = await repo.findByKey('new-dashboard')

      expect(result).toEqual(mockRow)
      expect(chains.select.limit).toHaveBeenCalledWith(1)
    })

    it('should return null when not found', async () => {
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([])
      const repo = new DrizzleFeatureFlagRepository(db as never)

      const result = await repo.findByKey('unknown')

      expect(result).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should return all rows ordered by createdAt DESC', async () => {
      const { db, chains } = createMockDb()
      chains.select.orderBy.mockResolvedValue([mockRow])
      const repo = new DrizzleFeatureFlagRepository(db as never)

      const result = await repo.findAll()

      expect(result).toEqual([mockRow])
    })
  })

  describe('findById', () => {
    it('should return the row when found', async () => {
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([mockRow])
      const repo = new DrizzleFeatureFlagRepository(db as never)

      const result = await repo.findById('flag-1')

      expect(result).toEqual(mockRow)
    })

    it('should return null when not found', async () => {
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([])
      const repo = new DrizzleFeatureFlagRepository(db as never)

      const result = await repo.findById('unknown')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should insert and return the created row', async () => {
      const { db, chains } = createMockDb()
      chains.insert.returning.mockResolvedValue([mockRow])
      const repo = new DrizzleFeatureFlagRepository(db as never)

      const result = await repo.create({ name: 'New Dashboard', key: 'new-dashboard' })

      expect(result).toEqual(mockRow)
      expect(db.insert).toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update and return the row', async () => {
      const { db, chains } = createMockDb()
      const updated = { ...mockRow, enabled: false }
      chains.update.returning.mockResolvedValue([updated])
      const repo = new DrizzleFeatureFlagRepository(db as never)

      const result = await repo.update('flag-1', { enabled: false })

      expect(result).toEqual(updated)
    })

    it('should return null when row not found', async () => {
      const { db, chains } = createMockDb()
      chains.update.returning.mockResolvedValue([])
      const repo = new DrizzleFeatureFlagRepository(db as never)

      const result = await repo.update('unknown', { enabled: true })

      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete and return the row', async () => {
      const { db, chains } = createMockDb()
      chains.delete.returning.mockResolvedValue([mockRow])
      const repo = new DrizzleFeatureFlagRepository(db as never)

      const result = await repo.delete('flag-1')

      expect(result).toEqual(mockRow)
    })

    it('should return null when row not found', async () => {
      const { db, chains } = createMockDb()
      chains.delete.returning.mockResolvedValue([])
      const repo = new DrizzleFeatureFlagRepository(db as never)

      const result = await repo.delete('unknown')

      expect(result).toBeNull()
    })
  })
})
