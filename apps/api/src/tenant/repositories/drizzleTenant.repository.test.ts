import { describe, expect, it, vi } from 'vitest'

import { DrizzleTenantRepository } from './drizzleTenant.repository.js'

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

describe('DrizzleTenantRepository', () => {
  describe('lookupOrganization', () => {
    it('should return null when organization is not found', async () => {
      const db = createMockDb()
      const chain = createChainMock([])
      db.select.mockReturnValue(chain)

      const repo = new DrizzleTenantRepository(db as never)
      const result = await repo.lookupOrganization('org-missing')

      expect(result).toBeNull()
    })

    it('should return organization with parsed metadata when metadata is a JSON string', async () => {
      const orgRow = {
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        logo: null,
        metadata: '{"plan":"pro","seats":5}',
        deletedAt: null,
        deleteScheduledFor: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb()
      const chain = createChainMock([orgRow])
      db.select.mockReturnValue(chain)

      const repo = new DrizzleTenantRepository(db as never)
      const result = await repo.lookupOrganization('org-1')

      expect(result).not.toBeNull()
      expect(result?.metadata).toEqual({ plan: 'pro', seats: 5 })
      expect(result?.id).toBe('org-1')
      expect(result?.name).toBe('Acme Corp')
    })

    it('should return organization with null metadata when metadata field is null', async () => {
      const orgRow = {
        id: 'org-2',
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
      const chain = createChainMock([orgRow])
      db.select.mockReturnValue(chain)

      const repo = new DrizzleTenantRepository(db as never)
      const result = await repo.lookupOrganization('org-2')

      expect(result).not.toBeNull()
      expect(result?.metadata).toBeNull()
    })

    it('should use provided tx instead of db when tx is given', async () => {
      const orgRow = {
        id: 'org-3',
        name: 'Gamma Inc',
        slug: 'gamma-inc',
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

      const repo = new DrizzleTenantRepository(db as never)
      const result = await repo.lookupOrganization('org-3', tx as never)

      expect(result?.id).toBe('org-3')
      // tx was used, not db
      expect(tx.select).toHaveBeenCalled()
      expect(db.select).not.toHaveBeenCalled()
    })
  })
})
