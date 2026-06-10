import { describe, expect, it, vi } from 'vitest'

import { DrizzleOrganizationLookupRepository } from './organizationLookup.repository.js'

function createChainMock(result: unknown = []) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'from', 'where', 'limit']
  for (const m of methods) {
    chain[m] = vi.fn(() => chain)
  }
  // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for Drizzle chain
  chain.then = (resolve: (v: unknown) => void) => resolve(result)
  return chain
}

function createMockDb() {
  return {
    select: vi.fn(),
  }
}

describe('DrizzleOrganizationLookupRepository', () => {
  describe('findById', () => {
    it('should return the organization when found', async () => {
      const orgRow = {
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        logo: null,
        metadata: null,
        deletedAt: null,
        deleteScheduledFor: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb()
      const chain = createChainMock([orgRow])
      db.select.mockReturnValue(chain)

      const repo = new DrizzleOrganizationLookupRepository(db as never)
      const result = await repo.findById('org-1')

      expect(result).toEqual(orgRow)
    })

    it('should return null when organization is not found', async () => {
      const db = createMockDb()
      const chain = createChainMock([])
      db.select.mockReturnValue(chain)

      const repo = new DrizzleOrganizationLookupRepository(db as never)
      const result = await repo.findById('org-missing')

      expect(result).toBeNull()
    })

    it('should use provided tx instead of db when tx is given', async () => {
      const orgRow = {
        id: 'org-3',
        name: 'Beta LLC',
        slug: 'beta-llc',
        logo: null,
        metadata: null,
        deletedAt: null,
        deleteScheduledFor: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb()
      const txChain = createChainMock([orgRow])
      const tx = { select: vi.fn().mockReturnValue(txChain) }

      const repo = new DrizzleOrganizationLookupRepository(db as never)
      const result = await repo.findById('org-3', tx as never)

      expect(result?.id).toBe('org-3')
      expect(tx.select).toHaveBeenCalled()
      expect(db.select).not.toHaveBeenCalled()
    })
  })
})
