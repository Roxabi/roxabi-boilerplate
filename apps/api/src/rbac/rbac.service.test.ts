import type { ClsService } from 'nestjs-cls'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TenantService } from '../tenant/tenant.service.js'
import { DefaultRoleException } from './exceptions/defaultRole.exception.js'
import { RoleInsertFailedException } from './exceptions/roleInsertFailed.exception.js'
import { RoleNotFoundException } from './exceptions/roleNotFound.exception.js'
import { RoleSlugConflictException } from './exceptions/roleSlugConflict.exception.js'
import { RbacService } from './rbac.service.js'

type MockFn = ReturnType<typeof vi.fn>
type MockChain = Record<
  | 'select'
  | 'from'
  | 'where'
  | 'limit'
  | 'insert'
  | 'values'
  | 'returning'
  | 'update'
  | 'set'
  | 'delete'
  | 'innerJoin',
  MockFn
>

/** Creates a chainable mock where every method returns `this` and the terminal method resolves. */
function chain(terminal: string, value: unknown): MockChain {
  const methods = [
    'select',
    'from',
    'where',
    'limit',
    'insert',
    'values',
    'returning',
    'update',
    'set',
    'delete',
    'innerJoin',
  ] as const
  const obj = Object.fromEntries(methods.map((m) => [m, vi.fn()])) as MockChain
  for (const m of methods) {
    if (m !== terminal) obj[m].mockReturnValue(obj)
  }
  obj[terminal as keyof MockChain].mockResolvedValue(value)
  return obj
}

describe('RbacService', () => {
  let mockCls: ClsService
  let mockTenantService: TenantService

  beforeEach(() => {
    mockCls = { get: vi.fn().mockReturnValue('tenant-1') } as unknown as ClsService
    mockTenantService = {
      query: vi.fn().mockImplementation((cb) => cb(null)),
      queryAs: vi.fn().mockImplementation((_id, cb) => cb(null)),
    } as unknown as TenantService
  })

  describe('listRoles', () => {
    it('should list roles for current tenant', async () => {
      const mockRoles = [{ id: 'r-1', name: 'Owner', slug: 'owner' }]
      const txChain = chain('from', mockRoles)
      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => cb(txChain))

      const service = new RbacService(mockTenantService, mockCls)
      const result = await service.listRoles()

      expect(result).toEqual(mockRoles)
    })
  })

  describe('createRole', () => {
    it('should create a custom role with permissions', async () => {
      const newRole = { id: 'r-new', name: 'Custom', slug: 'custom', isDefault: false }

      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        // Slug check → no collision
        const slugCheck = chain('limit', [])
        // Insert → returning role
        const insertChain = chain('returning', [newRole])
        // Permission lookup
        const permChain = chain('from', [{ id: 'p-1', resource: 'roles', action: 'read' }])

        const tx = {
          select: vi.fn().mockReturnValueOnce(slugCheck).mockReturnValueOnce(permChain),
          insert: vi.fn().mockReturnValue(insertChain),
        }
        // Wire slug check chain
        slugCheck.from.mockReturnValue(slugCheck)
        slugCheck.where.mockReturnValue(slugCheck)

        return cb(tx)
      })

      const service = new RbacService(mockTenantService, mockCls)
      const result = await service.createRole({ name: 'Custom', permissions: ['roles:read'] })

      expect(result).toEqual(newRole)
    })

    it('should throw RoleInsertFailedException when insert returns empty', async () => {
      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        const slugCheck = chain('limit', [])
        const insertChain = chain('returning', [])
        const permChain = chain('from', [{ id: 'p-1', resource: 'roles', action: 'read' }])

        const tx = {
          select: vi.fn().mockReturnValueOnce(slugCheck).mockReturnValueOnce(permChain),
          insert: vi.fn().mockReturnValue(insertChain),
        }
        slugCheck.from.mockReturnValue(slugCheck)
        slugCheck.where.mockReturnValue(slugCheck)

        return cb(tx)
      })

      const service = new RbacService(mockTenantService, mockCls)
      await expect(
        service.createRole({ name: 'Ghost', permissions: ['roles:read'] })
      ).rejects.toThrow(RoleInsertFailedException)
    })

    it('should reject duplicate slug within same tenant', async () => {
      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        const slugCheck = chain('limit', [{ id: 'r-existing' }])
        const tx = { select: vi.fn().mockReturnValue(slugCheck) }
        slugCheck.from.mockReturnValue(slugCheck)
        slugCheck.where.mockReturnValue(slugCheck)
        return cb(tx)
      })

      const service = new RbacService(mockTenantService, mockCls)
      await expect(
        service.createRole({ name: 'Owner', permissions: ['roles:read'] })
      ).rejects.toThrow(RoleSlugConflictException)
    })
  })

  describe('updateRole', () => {
    it('should update role fields', async () => {
      const updatedRole = { id: 'r-1', name: 'New', slug: 'new' }

      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        // Exists check
        const existsChain = chain('limit', [{ id: 'r-1', name: 'Old', slug: 'old' }])
        // Slug collision check → no collision
        const collisionChain = chain('limit', [])
        collisionChain.from.mockReturnValue(collisionChain)
        collisionChain.where.mockReturnValue(collisionChain)
        // Update
        const updateChain = chain('where', undefined)
        // Return updated
        const returnChain = chain('where', [updatedRole])

        const selectCallCount = { n: 0 }
        const tx = {
          select: vi.fn().mockImplementation(() => {
            selectCallCount.n++
            if (selectCallCount.n === 1) return existsChain
            if (selectCallCount.n === 2) return collisionChain
            return returnChain
          }),
          update: vi.fn().mockReturnValue(updateChain),
        }
        existsChain.from.mockReturnValue(existsChain)
        existsChain.where.mockReturnValue(existsChain)
        returnChain.from.mockReturnValue(returnChain)
        return cb(tx)
      })

      const service = new RbacService(mockTenantService, mockCls)
      const result = await service.updateRole('r-1', { name: 'New' })

      expect(result).toEqual(updatedRole)
    })

    it('should throw RoleNotFoundException if not found', async () => {
      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        const existsChain = chain('limit', [])
        const tx = { select: vi.fn().mockReturnValue(existsChain) }
        existsChain.from.mockReturnValue(existsChain)
        existsChain.where.mockReturnValue(existsChain)
        return cb(tx)
      })

      const service = new RbacService(mockTenantService, mockCls)
      await expect(service.updateRole('r-missing', { name: 'New' })).rejects.toThrow(
        RoleNotFoundException
      )
    })
  })

  describe('deleteRole', () => {
    it('should delete a custom role and fallback members to Viewer', async () => {
      const updateChain = chain('where', undefined)
      const deleteChain = chain('where', undefined)

      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        // Exists check
        const existsChain = chain('limit', [
          { id: 'r-custom', isDefault: false, tenantId: 'tenant-1' },
        ])
        // Viewer lookup
        const viewerChain = chain('limit', [{ id: 'r-viewer' }])

        const selectCallCount = { n: 0 }
        const tx = {
          select: vi.fn().mockImplementation(() => {
            selectCallCount.n++
            return selectCallCount.n === 1 ? existsChain : viewerChain
          }),
          update: vi.fn().mockReturnValue(updateChain),
          delete: vi.fn().mockReturnValue(deleteChain),
        }
        existsChain.from.mockReturnValue(existsChain)
        existsChain.where.mockReturnValue(existsChain)
        viewerChain.from.mockReturnValue(viewerChain)
        viewerChain.where.mockReturnValue(viewerChain)
        return cb(tx)
      })

      const service = new RbacService(mockTenantService, mockCls)
      const result = await service.deleteRole('r-custom')

      expect(result).toEqual({ deleted: true })
    })

    it('should reject deleting a default role', async () => {
      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        const existsChain = chain('limit', [
          { id: 'r-owner', isDefault: true, tenantId: 'tenant-1' },
        ])
        const tx = { select: vi.fn().mockReturnValue(existsChain) }
        existsChain.from.mockReturnValue(existsChain)
        existsChain.where.mockReturnValue(existsChain)
        return cb(tx)
      })

      const service = new RbacService(mockTenantService, mockCls)
      await expect(service.deleteRole('r-owner')).rejects.toThrow(DefaultRoleException)
    })

    it('should throw RoleNotFoundException if not found', async () => {
      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        const existsChain = chain('limit', [])
        const tx = { select: vi.fn().mockReturnValue(existsChain) }
        existsChain.from.mockReturnValue(existsChain)
        existsChain.where.mockReturnValue(existsChain)
        return cb(tx)
      })

      const service = new RbacService(mockTenantService, mockCls)
      await expect(service.deleteRole('r-missing')).rejects.toThrow(RoleNotFoundException)
    })
  })

  describe('getRolePermissions', () => {
    it('should return permissions for a role', async () => {
      const perms = [{ id: 'p-1', resource: 'roles', action: 'read', description: 'View roles' }]

      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        const existsChain = chain('limit', [{ id: 'r-1' }])
        const permJoinChain = chain('where', perms)

        const selectCallCount = { n: 0 }
        const tx = {
          select: vi.fn().mockImplementation(() => {
            selectCallCount.n++
            return selectCallCount.n === 1 ? existsChain : permJoinChain
          }),
        }
        existsChain.from.mockReturnValue(existsChain)
        existsChain.where.mockReturnValue(existsChain)
        permJoinChain.from.mockReturnValue(permJoinChain)
        permJoinChain.innerJoin.mockReturnValue(permJoinChain)
        return cb(tx)
      })

      const service = new RbacService(mockTenantService, mockCls)
      const result = await service.getRolePermissions('r-1')

      expect(result).toEqual(perms)
    })

    it('should throw RoleNotFoundException if not found', async () => {
      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        const existsChain = chain('limit', [])
        const tx = { select: vi.fn().mockReturnValue(existsChain) }
        existsChain.from.mockReturnValue(existsChain)
        existsChain.where.mockReturnValue(existsChain)
        return cb(tx)
      })

      const service = new RbacService(mockTenantService, mockCls)
      await expect(service.getRolePermissions('r-missing')).rejects.toThrow(RoleNotFoundException)
    })
  })

  describe('seedDefaultRoles', () => {
    it('should seed Owner, Admin, Member, Viewer roles with permissions', async () => {
      const allPerms = [
        { id: 'p-1', resource: 'users', action: 'read' },
        { id: 'p-2', resource: 'users', action: 'write' },
        { id: 'p-3', resource: 'organizations', action: 'read' },
        { id: 'p-4', resource: 'members', action: 'read' },
        { id: 'p-5', resource: 'roles', action: 'read' },
      ]

      let insertCount = 0
      ;(mockTenantService.queryAs as ReturnType<typeof vi.fn>).mockImplementation((_id, cb) => {
        const insertChain = chain('returning', [])
        // Override returning to track inserts and return role
        insertChain.returning.mockImplementation(() => {
          insertCount++
          return Promise.resolve([{ id: `role-${insertCount}` }])
        })

        // syncPermissions calls tx.select().from(permissions) to resolve permission IDs
        const permSelectChain = chain('from', allPerms)

        const tx = {
          insert: vi.fn().mockReturnValue(insertChain),
          select: vi.fn().mockReturnValue(permSelectChain),
        }
        return cb(tx)
      })

      const service = new RbacService(mockTenantService, mockCls)
      await service.seedDefaultRoles('org-1')

      expect(mockTenantService.queryAs).toHaveBeenCalledWith('org-1', expect.any(Function))
      // 4 default roles + their permission inserts
      expect(insertCount).toBeGreaterThanOrEqual(4)
    })
  })
})
