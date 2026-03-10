import { describe, expect, it, vi } from 'vitest'
import type { SaveConsentDto } from '../consent.repository.js'
import { ConsentInsertFailedException } from '../exceptions/consentInsertFailed.exception.js'
import { ConsentNotFoundException } from '../exceptions/consentNotFound.exception.js'
import { DrizzleConsentRepository } from './drizzleConsent.repository.js'

const mockRow = {
  id: 'consent-1',
  userId: 'user-1',
  categories: { necessary: true, analytics: true, marketing: false },
  policyVersion: '2026-02-v1',
  action: 'customized',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  createdAt: new Date('2026-02-17T12:00:00Z'),
  updatedAt: new Date('2026-02-17T12:00:00Z'),
}

function createMockDb() {
  const returningFn = vi.fn()
  const valuesFn = vi.fn().mockReturnValue({ returning: returningFn })
  const insertFn = vi.fn().mockReturnValue({ values: valuesFn })

  const limitFn = vi.fn()
  const orderByFn = vi.fn().mockReturnValue({ limit: limitFn })
  const whereFn = vi.fn().mockReturnValue({ orderBy: orderByFn })
  const fromFn = vi.fn().mockReturnValue({ where: whereFn })
  const selectFn = vi.fn().mockReturnValue({ from: fromFn })

  return {
    db: { insert: insertFn, select: selectFn },
    chains: {
      insert: { values: valuesFn, returning: returningFn },
      select: { from: fromFn, where: whereFn, orderBy: orderByFn, limit: limitFn },
    },
  }
}

describe('DrizzleConsentRepository', () => {
  describe('saveConsent', () => {
    it('should insert a consent record and return the mapped ConsentRecord', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      chains.insert.returning.mockResolvedValue([mockRow])
      const repo = new DrizzleConsentRepository(db as never)

      const dto: SaveConsentDto = {
        categories: { necessary: true, analytics: true, marketing: false },
        policyVersion: '2026-02-v1',
        action: 'customized',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      }

      // Act
      const result = await repo.saveConsent('user-1', dto)

      // Assert
      expect(db.insert).toHaveBeenCalled()
      expect(chains.insert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          categories: { necessary: true, analytics: true, marketing: false },
          policyVersion: '2026-02-v1',
          action: 'customized',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      )
      expect(result).toEqual({
        id: 'consent-1',
        userId: 'user-1',
        categories: { necessary: true, analytics: true, marketing: false },
        policyVersion: '2026-02-v1',
        action: 'customized',
        createdAt: '2026-02-17T12:00:00.000Z',
        updatedAt: '2026-02-17T12:00:00.000Z',
      })
    })

    it('should throw ConsentInsertFailedException when .returning() yields no rows', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      chains.insert.returning.mockResolvedValue([])
      const repo = new DrizzleConsentRepository(db as never)

      const dto: SaveConsentDto = {
        categories: { necessary: true, analytics: false, marketing: false },
        policyVersion: '2026-02-v1',
        action: 'rejected',
      }

      // Act & Assert
      await expect(repo.saveConsent('user-1', dto)).rejects.toThrow(ConsentInsertFailedException)
    })
  })

  describe('getLatestByUserId', () => {
    it('should query consent records and return the mapped ConsentRecord', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([mockRow])
      const repo = new DrizzleConsentRepository(db as never)

      // Act
      const result = await repo.getLatestByUserId('user-1')

      // Assert
      expect(db.select).toHaveBeenCalled()
      expect(chains.select.where).toHaveBeenCalled()
      expect(chains.select.limit).toHaveBeenCalledWith(1)
      expect(result).toEqual({
        id: 'consent-1',
        userId: 'user-1',
        categories: { necessary: true, analytics: true, marketing: false },
        policyVersion: '2026-02-v1',
        action: 'customized',
        createdAt: '2026-02-17T12:00:00.000Z',
        updatedAt: '2026-02-17T12:00:00.000Z',
      })
    })

    it('should throw ConsentNotFoundException when no record exists for the user', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      chains.select.limit.mockResolvedValue([])
      const repo = new DrizzleConsentRepository(db as never)

      // Act & Assert
      await expect(repo.getLatestByUserId('nonexistent-user')).rejects.toThrow(
        ConsentNotFoundException
      )
    })
  })
})
