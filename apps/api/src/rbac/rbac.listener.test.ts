import { describe, expect, it, vi } from 'vitest'
import { OrganizationCreatedEvent } from '../common/events/organizationCreated.event.js'
import { RbacListener } from './rbac.listener.js'

function chain(terminal: string, value: unknown) {
  const obj: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const m of ['select', 'from', 'where', 'limit', 'update', 'set']) {
    obj[m] = vi.fn().mockReturnValue(obj)
  }
  // biome-ignore lint: terminal is always a valid key from the list above
  obj[terminal]!.mockResolvedValue(value)
  return obj
}

function createMockTenantService(mockTx: unknown) {
  return {
    queryAs: vi.fn(async (_orgId: string, callback: (tx: unknown) => Promise<void>) => {
      await callback(mockTx)
    }),
  }
}

describe('RbacListener', () => {
  it('should seed default roles and assign Owner to creator', async () => {
    const mockRbacService = {
      seedDefaultRoles: vi.fn().mockResolvedValue(undefined),
    }

    const ownerRoleChain = chain('limit', [{ id: 'role-owner' }])
    const updateChain = chain('where', undefined)

    const mockTx = {
      select: vi.fn().mockReturnValue(ownerRoleChain),
      update: vi.fn().mockReturnValue(updateChain),
    }

    const mockTenantService = createMockTenantService(mockTx)

    const listener = new RbacListener(mockRbacService as never, mockTenantService as never)
    const event = new OrganizationCreatedEvent('org-1', 'user-1')
    await listener.handleOrganizationCreated(event)

    expect(mockRbacService.seedDefaultRoles).toHaveBeenCalledWith('org-1', mockTx)
    expect(mockTenantService.queryAs).toHaveBeenCalledWith('org-1', expect.any(Function))
    expect(mockTx.update).toHaveBeenCalled()
  })

  it('should skip member update when no Owner role found', async () => {
    const mockRbacService = {
      seedDefaultRoles: vi.fn().mockResolvedValue(undefined),
    }

    const ownerRoleChain = chain('limit', [])

    const mockTx = {
      select: vi.fn().mockReturnValue(ownerRoleChain),
      update: vi.fn(),
    }

    const mockTenantService = createMockTenantService(mockTx)

    const listener = new RbacListener(mockRbacService as never, mockTenantService as never)
    const event = new OrganizationCreatedEvent('org-1', 'user-1')
    await listener.handleOrganizationCreated(event)

    expect(mockRbacService.seedDefaultRoles).toHaveBeenCalledWith('org-1', mockTx)
    expect(mockTenantService.queryAs).toHaveBeenCalledWith('org-1', expect.any(Function))
    expect(mockTx.update).not.toHaveBeenCalled()
  })
})
