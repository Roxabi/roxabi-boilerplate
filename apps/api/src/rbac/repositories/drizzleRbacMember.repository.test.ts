import { describe, expect, it, vi } from 'vitest'
import { DrizzleRbacMemberRepository } from './drizzleRbacMember.repository.js'

function createMockTx() {
  const terminal = vi.fn()

  const mockTx = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => terminal()),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    _terminal: terminal,
  }

  return { tx: mockTx, terminal }
}

const mockRole = {
  id: 'role-1',
  tenantId: 'org-1',
  name: 'Admin',
  slug: 'admin',
  description: null,
  isDefault: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

const mockMember = {
  id: 'member-1',
  userId: 'user-1',
  organizationId: 'org-1',
  role: 'member',
  roleId: 'role-1',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

describe('DrizzleRbacMemberRepository', () => {
  describe('findDefaultRoles', () => {
    it('should return default roles for tenant', async () => {
      // Arrange
      const { tx } = createMockTx()
      const defaultRoles = [{ id: 'role-1', slug: 'viewer' }]
      tx.where.mockResolvedValueOnce(defaultRoles)
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      const result = await repo.findDefaultRoles('org-1', tx as never)

      // Assert
      expect(result).toEqual(defaultRoles)
      expect(tx.select).toHaveBeenCalled()
      expect(tx.from).toHaveBeenCalled()
      expect(tx.where).toHaveBeenCalled()
    })

    it('should return empty array when no default roles', async () => {
      // Arrange
      const { tx } = createMockTx()
      tx.where.mockResolvedValueOnce([])
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      const result = await repo.findDefaultRoles('org-1', tx as never)

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('findMemberByUserAndOrg', () => {
    it('should return member when found', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([{ id: 'member-1' }])
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      const result = await repo.findMemberByUserAndOrg('user-1', 'org-1', 'role-1', tx as never)

      // Assert
      expect(result).toEqual({ id: 'member-1' })
      expect(tx.select).toHaveBeenCalled()
      expect(tx.where).toHaveBeenCalled()
      expect(tx.limit).toHaveBeenCalledWith(1)
    })

    it('should return undefined when member not found', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      const result = await repo.findMemberByUserAndOrg('user-1', 'org-1', 'role-1', tx as never)

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('findMemberByIdAndOrg', () => {
    it('should return member when found by id', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([{ id: 'member-1' }])
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      const result = await repo.findMemberByIdAndOrg('member-1', 'org-1', 'role-1', tx as never)

      // Assert
      expect(result).toEqual({ id: 'member-1' })
    })

    it('should return undefined when member not found', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      const result = await repo.findMemberByIdAndOrg('missing', 'org-1', 'role-1', tx as never)

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('updateMemberRole', () => {
    it('should update the member roleId', async () => {
      // Arrange
      const { tx } = createMockTx()
      tx.where.mockResolvedValueOnce([])
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      await repo.updateMemberRole('member-1', 'new-role-id', tx as never)

      // Assert
      expect(tx.update).toHaveBeenCalled()
      expect(tx.set).toHaveBeenCalled()
      expect(tx.where).toHaveBeenCalled()
    })
  })

  describe('findRoleInTenant', () => {
    it('should return role when found in tenant', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([mockRole])
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      const result = await repo.findRoleInTenant('role-1', 'org-1', tx as never)

      // Assert
      expect(result).toEqual(mockRole)
    })

    it('should return undefined when role not found in tenant', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      const result = await repo.findRoleInTenant('role-1', 'other-org', tx as never)

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('findMemberInOrg', () => {
    it('should return full member row when found', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([mockMember])
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      const result = await repo.findMemberInOrg('member-1', 'org-1', tx as never)

      // Assert
      expect(result).toEqual(mockMember)
    })

    it('should return undefined when member not in org', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      const result = await repo.findMemberInOrg('member-1', 'other-org', tx as never)

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('findRoleById', () => {
    it('should return role when found', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([mockRole])
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      const result = await repo.findRoleById('role-1', tx as never)

      // Assert
      expect(result).toEqual(mockRole)
    })

    it('should return undefined when role not found', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      const result = await repo.findRoleById('missing-role', tx as never)

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('countMembersWithRole', () => {
    it('should return count of members with given role', async () => {
      // Arrange
      const { tx } = createMockTx()
      tx.where.mockResolvedValueOnce([{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }])
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      const result = await repo.countMembersWithRole('org-1', 'role-1', tx as never)

      // Assert
      expect(result).toBe(3)
    })

    it('should return 0 when no members have that role', async () => {
      // Arrange
      const { tx } = createMockTx()
      tx.where.mockResolvedValueOnce([])
      const repo = new DrizzleRbacMemberRepository({} as never)

      // Act
      const result = await repo.countMembersWithRole('org-1', 'role-1', tx as never)

      // Assert
      expect(result).toBe(0)
    })
  })
})
