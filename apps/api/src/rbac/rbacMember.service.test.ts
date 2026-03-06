import type { ClsService } from 'nestjs-cls'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TenantService } from '../tenant/tenant.service.js'
import { MemberNotFoundException } from './exceptions/memberNotFound.exception.js'
import { OwnershipConstraintException } from './exceptions/ownershipConstraint.exception.js'
import { RoleNotFoundException } from './exceptions/roleNotFound.exception.js'
import { RbacMemberService } from './rbacMember.service.js'

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

describe('RbacMemberService', () => {
  let mockCls: ClsService
  let mockTenantService: TenantService

  beforeEach(() => {
    mockCls = { get: vi.fn().mockReturnValue('tenant-1') } as unknown as ClsService
    mockTenantService = {
      query: vi.fn().mockImplementation((cb) => cb(null)),
      queryAs: vi.fn().mockImplementation((_id, cb) => cb(null)),
    } as unknown as TenantService
  })

  describe('transferOwnership', () => {
    it('should transfer ownership from Owner to Admin', async () => {
      const ownerRole = { id: 'r-owner', slug: 'owner', isDefault: true }
      const adminRole = { id: 'r-admin', slug: 'admin', isDefault: true }

      const updateChain = chain('where', undefined)

      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        const rolesChain = chain('where', [ownerRole, adminRole])
        rolesChain.from.mockReturnValue(rolesChain)
        const currentMemberChain = chain('limit', [
          { id: 'm-1', userId: 'user-1', roleId: 'r-owner' },
        ])
        currentMemberChain.from.mockReturnValue(currentMemberChain)
        currentMemberChain.where.mockReturnValue(currentMemberChain)
        const targetMemberChain = chain('limit', [
          { id: 'm-2', userId: 'user-2', roleId: 'r-admin' },
        ])
        targetMemberChain.from.mockReturnValue(targetMemberChain)
        targetMemberChain.where.mockReturnValue(targetMemberChain)

        const txSelectCount = { n: 0 }
        const tx = {
          select: vi.fn().mockImplementation(() => {
            txSelectCount.n++
            if (txSelectCount.n === 1) return rolesChain
            if (txSelectCount.n === 2) return currentMemberChain
            return targetMemberChain
          }),
          update: vi.fn().mockReturnValue(updateChain),
        }
        return cb(tx)
      })

      const service = new RbacMemberService(mockTenantService, mockCls)
      const result = await service.transferOwnership('user-1', 'm-2')

      expect(result).toEqual({ transferred: true })
    })

    it('should reject transfer when current user is not Owner', async () => {
      const ownerRole = { id: 'r-owner', slug: 'owner', isDefault: true }
      const adminRole = { id: 'r-admin', slug: 'admin', isDefault: true }

      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        const rolesChain = chain('where', [ownerRole, adminRole])
        rolesChain.from.mockReturnValue(rolesChain)
        const currentMemberChain = chain('limit', []) // not found as Owner
        currentMemberChain.from.mockReturnValue(currentMemberChain)
        currentMemberChain.where.mockReturnValue(currentMemberChain)

        const txSelectCount = { n: 0 }
        const tx = {
          select: vi.fn().mockImplementation(() => {
            txSelectCount.n++
            return txSelectCount.n === 1 ? rolesChain : currentMemberChain
          }),
        }
        return cb(tx)
      })

      const service = new RbacMemberService(mockTenantService, mockCls)
      await expect(service.transferOwnership('user-1', 'm-2')).rejects.toThrow(
        OwnershipConstraintException
      )
    })

    it('should reject transfer to non-Admin member', async () => {
      const ownerRole = { id: 'r-owner', slug: 'owner', isDefault: true }
      const adminRole = { id: 'r-admin', slug: 'admin', isDefault: true }

      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        const rolesChain = chain('where', [ownerRole, adminRole])
        rolesChain.from.mockReturnValue(rolesChain)
        const currentMemberChain = chain('limit', [
          { id: 'm-1', userId: 'user-1', roleId: 'r-owner' },
        ])
        currentMemberChain.from.mockReturnValue(currentMemberChain)
        currentMemberChain.where.mockReturnValue(currentMemberChain)
        const targetMemberChain = chain('limit', []) // target not Admin
        targetMemberChain.from.mockReturnValue(targetMemberChain)
        targetMemberChain.where.mockReturnValue(targetMemberChain)

        const txSelectCount = { n: 0 }
        const tx = {
          select: vi.fn().mockImplementation(() => {
            txSelectCount.n++
            if (txSelectCount.n === 1) return rolesChain
            if (txSelectCount.n === 2) return currentMemberChain
            return targetMemberChain
          }),
        }
        return cb(tx)
      })

      const service = new RbacMemberService(mockTenantService, mockCls)
      await expect(service.transferOwnership('user-1', 'm-2')).rejects.toThrow(
        OwnershipConstraintException
      )
    })
  })

  describe('changeMemberRole', () => {
    it('should change a member role', async () => {
      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        const roleExistsChain = chain('limit', [{ id: 'r-new', slug: 'member' }])
        roleExistsChain.from.mockReturnValue(roleExistsChain)
        roleExistsChain.where.mockReturnValue(roleExistsChain)
        const memberChain = chain('limit', [{ id: 'm-1', roleId: 'r-old' }])
        memberChain.from.mockReturnValue(memberChain)
        memberChain.where.mockReturnValue(memberChain)
        const currentRoleChain = chain('limit', [{ id: 'r-old', slug: 'admin' }])
        currentRoleChain.from.mockReturnValue(currentRoleChain)
        currentRoleChain.where.mockReturnValue(currentRoleChain)
        const updateChain = chain('where', undefined)

        const txSelectCount = { n: 0 }
        const tx = {
          select: vi.fn().mockImplementation(() => {
            txSelectCount.n++
            if (txSelectCount.n === 1) return roleExistsChain
            if (txSelectCount.n === 2) return memberChain
            return currentRoleChain
          }),
          update: vi.fn().mockReturnValue(updateChain),
        }
        return cb(tx)
      })

      const service = new RbacMemberService(mockTenantService, mockCls)
      const result = await service.changeMemberRole('m-1', 'r-new')

      expect(result).toEqual({ updated: true })
    })

    it('should throw RoleNotFoundException for invalid role', async () => {
      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        const roleChain = chain('limit', [])
        roleChain.from.mockReturnValue(roleChain)
        roleChain.where.mockReturnValue(roleChain)
        return cb({ select: vi.fn().mockReturnValue(roleChain) })
      })

      const service = new RbacMemberService(mockTenantService, mockCls)
      await expect(service.changeMemberRole('m-1', 'r-invalid')).rejects.toThrow(
        RoleNotFoundException
      )
    })

    it('should throw MemberNotFoundException for invalid member', async () => {
      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        const roleChain = chain('limit', [{ id: 'r-new', slug: 'member' }])
        roleChain.from.mockReturnValue(roleChain)
        roleChain.where.mockReturnValue(roleChain)
        const memberChain = chain('limit', []) // member not found
        memberChain.from.mockReturnValue(memberChain)
        memberChain.where.mockReturnValue(memberChain)

        const txSelectCount = { n: 0 }
        const tx = {
          select: vi.fn().mockImplementation(() => {
            txSelectCount.n++
            return txSelectCount.n === 1 ? roleChain : memberChain
          }),
        }
        return cb(tx)
      })

      const service = new RbacMemberService(mockTenantService, mockCls)
      await expect(service.changeMemberRole('m-invalid', 'r-new')).rejects.toThrow(
        MemberNotFoundException
      )
    })

    it('should block removing last Owner', async () => {
      ;(mockTenantService.query as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        const roleExistsChain = chain('limit', [{ id: 'r-member', slug: 'member' }])
        roleExistsChain.from.mockReturnValue(roleExistsChain)
        roleExistsChain.where.mockReturnValue(roleExistsChain)
        const memberChain = chain('limit', [{ id: 'm-1', roleId: 'r-owner' }])
        memberChain.from.mockReturnValue(memberChain)
        memberChain.where.mockReturnValue(memberChain)
        const currentRoleChain = chain('limit', [{ id: 'r-owner', slug: 'owner' }])
        currentRoleChain.from.mockReturnValue(currentRoleChain)
        currentRoleChain.where.mockReturnValue(currentRoleChain)
        const ownerCountChain = chain('where', [{ id: 'm-1' }])
        ownerCountChain.from.mockReturnValue(ownerCountChain)

        const txSelectCount = { n: 0 }
        const tx = {
          select: vi.fn().mockImplementation(() => {
            txSelectCount.n++
            if (txSelectCount.n === 1) return roleExistsChain
            if (txSelectCount.n === 2) return memberChain
            if (txSelectCount.n === 3) return currentRoleChain
            return ownerCountChain
          }),
        }
        return cb(tx)
      })

      const service = new RbacMemberService(mockTenantService, mockCls)
      await expect(service.changeMemberRole('m-1', 'r-member')).rejects.toThrow(
        OwnershipConstraintException
      )
    })
  })
})
