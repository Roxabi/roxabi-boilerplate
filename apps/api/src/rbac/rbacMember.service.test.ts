import type { ClsService } from 'nestjs-cls'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TenantService } from '../tenant/tenant.service.js'
import { MemberNotFoundException } from './exceptions/memberNotFound.exception.js'
import { OwnershipConstraintException } from './exceptions/ownershipConstraint.exception.js'
import { RoleNotFoundException } from './exceptions/roleNotFound.exception.js'
import type { RbacMemberRepository } from './rbacMember.repository.js'
import { RbacMemberService } from './rbacMember.service.js'

function createMockRbacMemberRepo(): RbacMemberRepository {
  return {
    findDefaultRoles: vi.fn(),
    findMemberByUserAndOrg: vi.fn(),
    findMemberByIdAndOrg: vi.fn(),
    updateMemberRole: vi.fn(),
    findRoleInTenant: vi.fn(),
    findMemberInOrg: vi.fn(),
    findRoleById: vi.fn(),
    countMembersWithRole: vi.fn(),
  } as unknown as RbacMemberRepository
}

describe('RbacMemberService', () => {
  let mockCls: ClsService
  let mockTenantService: TenantService

  beforeEach(() => {
    mockCls = { get: vi.fn().mockReturnValue('tenant-1') } as unknown as ClsService
    mockTenantService = {
      query: vi.fn().mockImplementation((cb: (tx: unknown) => unknown) => cb(null)),
      queryAs: vi.fn().mockImplementation((_id: string, cb: (tx: unknown) => unknown) => cb(null)),
    } as unknown as TenantService
  })

  describe('transferOwnership', () => {
    it('should transfer ownership from Owner to Admin', async () => {
      // Arrange
      const ownerRole = { id: 'r-owner', slug: 'owner', isDefault: true }
      const adminRole = { id: 'r-admin', slug: 'admin', isDefault: true }
      const mockRepo = createMockRbacMemberRepo()
      ;(mockRepo.findDefaultRoles as ReturnType<typeof vi.fn>).mockResolvedValue([
        ownerRole,
        adminRole,
      ])
      ;(mockRepo.findMemberByUserAndOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'm-1',
        userId: 'user-1',
        roleId: 'r-owner',
      })
      ;(mockRepo.findMemberByIdAndOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'm-2',
        userId: 'user-2',
        roleId: 'r-admin',
      })
      ;(mockRepo.updateMemberRole as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacMemberService(mockTenantService, mockCls, mockRepo as never)

      // Act
      const result = await service.transferOwnership('user-1', 'm-2')

      // Assert
      expect(result).toEqual({ transferred: true })
    })

    it('should reject transfer when current user is not Owner', async () => {
      // Arrange
      const ownerRole = { id: 'r-owner', slug: 'owner', isDefault: true }
      const adminRole = { id: 'r-admin', slug: 'admin', isDefault: true }
      const mockRepo = createMockRbacMemberRepo()
      ;(mockRepo.findDefaultRoles as ReturnType<typeof vi.fn>).mockResolvedValue([
        ownerRole,
        adminRole,
      ])
      ;(mockRepo.findMemberByUserAndOrg as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacMemberService(mockTenantService, mockCls, mockRepo as never)

      // Act & Assert
      await expect(service.transferOwnership('user-1', 'm-2')).rejects.toThrow(
        OwnershipConstraintException
      )
    })

    it('should reject transfer to non-Admin member', async () => {
      // Arrange
      const ownerRole = { id: 'r-owner', slug: 'owner', isDefault: true }
      const adminRole = { id: 'r-admin', slug: 'admin', isDefault: true }
      const mockRepo = createMockRbacMemberRepo()
      ;(mockRepo.findDefaultRoles as ReturnType<typeof vi.fn>).mockResolvedValue([
        ownerRole,
        adminRole,
      ])
      ;(mockRepo.findMemberByUserAndOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'm-1',
        userId: 'user-1',
        roleId: 'r-owner',
      })
      ;(mockRepo.findMemberByIdAndOrg as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacMemberService(mockTenantService, mockCls, mockRepo as never)

      // Act & Assert
      await expect(service.transferOwnership('user-1', 'm-2')).rejects.toThrow(
        OwnershipConstraintException
      )
    })
  })

  describe('changeMemberRole', () => {
    it('should change a member role', async () => {
      // Arrange
      const mockRepo = createMockRbacMemberRepo()
      ;(mockRepo.findRoleInTenant as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'r-new',
        slug: 'member',
      })
      ;(mockRepo.findMemberInOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'm-1',
        roleId: 'r-old',
      })
      ;(mockRepo.findRoleById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'r-old',
        slug: 'admin',
      })
      ;(mockRepo.updateMemberRole as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacMemberService(mockTenantService, mockCls, mockRepo as never)

      // Act
      const result = await service.changeMemberRole('m-1', 'r-new')

      // Assert
      expect(result).toEqual({ updated: true })
    })

    it('should throw RoleNotFoundException for invalid role', async () => {
      // Arrange
      const mockRepo = createMockRbacMemberRepo()
      ;(mockRepo.findRoleInTenant as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacMemberService(mockTenantService, mockCls, mockRepo as never)

      // Act & Assert
      await expect(service.changeMemberRole('m-1', 'r-invalid')).rejects.toThrow(
        RoleNotFoundException
      )
    })

    it('should throw MemberNotFoundException for invalid member', async () => {
      // Arrange
      const mockRepo = createMockRbacMemberRepo()
      ;(mockRepo.findRoleInTenant as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'r-new',
        slug: 'member',
      })
      ;(mockRepo.findMemberInOrg as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new RbacMemberService(mockTenantService, mockCls, mockRepo as never)

      // Act & Assert
      await expect(service.changeMemberRole('m-invalid', 'r-new')).rejects.toThrow(
        MemberNotFoundException
      )
    })

    it('should block removing last Owner', async () => {
      // Arrange
      const mockRepo = createMockRbacMemberRepo()
      ;(mockRepo.findRoleInTenant as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'r-member',
        slug: 'member',
      })
      ;(mockRepo.findMemberInOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'm-1',
        roleId: 'r-owner',
      })
      ;(mockRepo.findRoleById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'r-owner',
        slug: 'owner',
      })
      ;(mockRepo.countMembersWithRole as ReturnType<typeof vi.fn>).mockResolvedValue(1)

      const service = new RbacMemberService(mockTenantService, mockCls, mockRepo as never)

      // Act & Assert
      await expect(service.changeMemberRole('m-1', 'r-member')).rejects.toThrow(
        OwnershipConstraintException
      )
    })

    it('should block non-owner from promoting member to owner', async () => {
      // Arrange
      const mockRepo = createMockRbacMemberRepo()
      ;(mockRepo.findRoleInTenant as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'r-owner',
        slug: 'owner',
      })
      ;(mockRepo.findMemberInOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'm-1',
        roleId: 'r-admin',
      })
      ;(mockRepo.findRoleById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'r-admin',
        slug: 'admin',
      })

      const service = new RbacMemberService(mockTenantService, mockCls, mockRepo as never)

      // Act & Assert
      await expect(service.changeMemberRole('m-1', 'r-owner')).rejects.toThrow(
        OwnershipConstraintException
      )
    })
  })
})
