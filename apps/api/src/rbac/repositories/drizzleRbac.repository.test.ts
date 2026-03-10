import { describe, expect, it, vi } from 'vitest'
import { DrizzleRbacRepository } from './drizzleRbac.repository.js'

function createMockTx() {
  const terminal = vi.fn()

  const mockTx = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => terminal()),
    innerJoin: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => terminal()),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    _terminal: terminal,
  }

  return { tx: mockTx, terminal }
}

const mockRole = {
  id: 'role-1',
  tenantId: 'org-1',
  name: 'Admin',
  slug: 'admin',
  description: 'Administrator role',
  isDefault: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

describe('DrizzleRbacRepository', () => {
  describe('listRoles', () => {
    it('should return all roles', async () => {
      // Arrange
      const { tx } = createMockTx()
      tx.from.mockResolvedValueOnce([mockRole])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      const result = await repo.listRoles(tx as never)

      // Assert
      expect(result).toEqual([mockRole])
      expect(tx.select).toHaveBeenCalled()
      expect(tx.from).toHaveBeenCalled()
    })

    it('should return empty array when no roles', async () => {
      // Arrange
      const { tx } = createMockTx()
      tx.from.mockResolvedValueOnce([])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      const result = await repo.listRoles(tx as never)

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('findRoleBySlug', () => {
    it('should return role when found', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([{ id: 'role-1' }])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      const result = await repo.findRoleBySlug('org-1', 'admin', tx as never)

      // Assert
      expect(result).toEqual({ id: 'role-1' })
      expect(tx.select).toHaveBeenCalled()
      expect(tx.where).toHaveBeenCalled()
      expect(tx.limit).toHaveBeenCalledWith(1)
    })

    it('should return undefined when role not found', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      const result = await repo.findRoleBySlug('org-1', 'nonexistent', tx as never)

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('insertRole', () => {
    it('should insert and return new role', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([mockRole])
      const repo = new DrizzleRbacRepository({} as never)
      const data = {
        tenantId: 'org-1',
        name: 'Admin',
        slug: 'admin',
        description: 'Administrator role',
        isDefault: false,
      }

      // Act
      const result = await repo.insertRole(data, tx as never)

      // Assert
      expect(result).toEqual(mockRole)
      expect(tx.insert).toHaveBeenCalled()
      expect(tx.values).toHaveBeenCalled()
      expect(tx.returning).toHaveBeenCalled()
    })

    it('should return undefined when insert fails to return row', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      const result = await repo.insertRole(
        { tenantId: 'org-1', name: 'Test', slug: 'test', description: null, isDefault: false },
        tx as never
      )

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('checkSlugCollision', () => {
    it('should return existing role when slug collides', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([{ id: 'role-1' }])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      const result = await repo.checkSlugCollision('org-1', 'admin', tx as never)

      // Assert
      expect(result).toEqual({ id: 'role-1' })
    })

    it('should return undefined when no collision', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      const result = await repo.checkSlugCollision('org-1', 'new-slug', tx as never)

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('findRoleById', () => {
    it('should return role when found', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([mockRole])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      const result = await repo.findRoleById('role-1', tx as never)

      // Assert
      expect(result).toEqual(mockRole)
    })

    it('should return undefined when role not found', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      const result = await repo.findRoleById('missing-role', tx as never)

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('updateRole', () => {
    it('should update role fields', async () => {
      // Arrange
      const { tx } = createMockTx()
      tx.where.mockResolvedValueOnce([])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      await repo.updateRole('role-1', { name: 'Updated Admin' }, tx as never)

      // Assert
      expect(tx.update).toHaveBeenCalled()
      expect(tx.set).toHaveBeenCalled()
      expect(tx.where).toHaveBeenCalled()
    })
  })

  describe('deleteRolePermissions', () => {
    it('should delete permissions for the role', async () => {
      // Arrange
      const { tx } = createMockTx()
      tx.where.mockResolvedValueOnce([])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      await repo.deleteRolePermissions('role-1', tx as never)

      // Assert
      expect(tx.delete).toHaveBeenCalled()
      expect(tx.where).toHaveBeenCalled()
    })
  })

  describe('deleteRole', () => {
    it('should delete the role', async () => {
      // Arrange
      const { tx } = createMockTx()
      tx.where.mockResolvedValueOnce([])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      await repo.deleteRole('role-1', tx as never)

      // Assert
      expect(tx.delete).toHaveBeenCalled()
      expect(tx.where).toHaveBeenCalled()
    })
  })

  describe('findViewerRole', () => {
    it('should return viewer role when found', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([{ id: 'viewer-role-id' }])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      const result = await repo.findViewerRole('org-1', tx as never)

      // Assert
      expect(result).toEqual({ id: 'viewer-role-id' })
    })

    it('should return undefined when viewer role not found', async () => {
      // Arrange
      const { tx, terminal } = createMockTx()
      terminal.mockResolvedValueOnce([])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      const result = await repo.findViewerRole('org-1', tx as never)

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('reassignMembersToRole', () => {
    it('should update member roleIds', async () => {
      // Arrange
      const { tx } = createMockTx()
      tx.where.mockResolvedValueOnce([])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      await repo.reassignMembersToRole('old-role', 'new-role', tx as never)

      // Assert
      expect(tx.update).toHaveBeenCalled()
      expect(tx.set).toHaveBeenCalled()
      expect(tx.where).toHaveBeenCalled()
    })
  })

  describe('getAllPermissions', () => {
    it('should return all permissions', async () => {
      // Arrange
      const { tx } = createMockTx()
      const perms = [
        { id: 'perm-1', resource: 'users', action: 'read' },
        { id: 'perm-2', resource: 'users', action: 'write' },
      ]
      tx.from.mockResolvedValueOnce(perms)
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      const result = await repo.getAllPermissions(tx as never)

      // Assert
      expect(result).toEqual(perms)
      expect(tx.select).toHaveBeenCalled()
      expect(tx.from).toHaveBeenCalled()
    })
  })

  describe('insertRolePermissions', () => {
    it('should insert when inserts array is non-empty', async () => {
      // Arrange
      const { tx } = createMockTx()
      tx.values.mockResolvedValueOnce([])
      const repo = new DrizzleRbacRepository({} as never)
      const inserts = [
        { roleId: 'role-1', permissionId: 'perm-1' },
        { roleId: 'role-1', permissionId: 'perm-2' },
      ]

      // Act
      await repo.insertRolePermissions(inserts, tx as never)

      // Assert
      expect(tx.insert).toHaveBeenCalled()
      expect(tx.values).toHaveBeenCalled()
    })

    it('should skip insert when inserts array is empty', async () => {
      // Arrange
      const { tx } = createMockTx()
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      await repo.insertRolePermissions([], tx as never)

      // Assert
      expect(tx.insert).not.toHaveBeenCalled()
    })
  })

  describe('getRolePermissions', () => {
    it('should return permissions for the role via innerJoin', async () => {
      // Arrange
      const { tx } = createMockTx()
      const perms = [{ id: 'perm-1', resource: 'users', action: 'read', description: null }]
      tx.where.mockResolvedValueOnce(perms)
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      const result = await repo.getRolePermissions('role-1', tx as never)

      // Assert
      expect(result).toEqual(perms)
      expect(tx.select).toHaveBeenCalled()
      expect(tx.from).toHaveBeenCalled()
      expect(tx.innerJoin).toHaveBeenCalled()
      expect(tx.where).toHaveBeenCalled()
    })

    it('should return empty array when role has no permissions', async () => {
      // Arrange
      const { tx } = createMockTx()
      tx.where.mockResolvedValueOnce([])
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      const result = await repo.getRolePermissions('role-1', tx as never)

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('seedDefaultRoles', () => {
    it('should insert role and permissions for each default role', async () => {
      // Arrange
      // seedDefaultRoles flow per role:
      //   1. insert(roles).values(data).returning()    → role row
      //   2. select().from(permissions)                → all permissions
      //   3. insert(rolePermissions).values(inserts)   → terminal (no returning)
      // We build a custom tx where values() can chain (for step 1) and also resolve (for step 3)
      const returningTerminal = vi
        .fn()
        .mockResolvedValueOnce([{ id: 'role-1', tenantId: 'org-1', name: 'Admin', slug: 'admin' }])
      let valuesCallCount = 0
      const txObj: Record<string, unknown> = {}
      const tx = {
        select: vi.fn().mockReturnThis(),
        from: vi
          .fn()
          .mockReturnThis() // default: return this (chaining)
          .mockResolvedValueOnce([
            { id: 'perm-1', resource: 'users', action: 'read', tenantId: null },
          ]), // first call: resolve with permissions list
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockImplementation(() => {
          valuesCallCount++
          if (valuesCallCount === 1) {
            // Step 1: chain to returning
            return { returning: returningTerminal }
          }
          // Step 3: terminal — resolve directly
          return Promise.resolve([])
        }),
        returning: returningTerminal,
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      }
      Object.assign(txObj, tx)

      const repo = new DrizzleRbacRepository({} as never)
      const defaultRoles = [
        { name: 'Admin', slug: 'admin', description: null, permissions: ['users:read'] },
      ]

      // Act
      await repo.seedDefaultRoles('org-1', defaultRoles, tx as never)

      // Assert
      expect(tx.insert).toHaveBeenCalled()
      expect(tx.values).toHaveBeenCalledTimes(2) // once for role, once for permissions
      expect(returningTerminal).toHaveBeenCalled()
    })

    it('should log warning and continue when role insert returns no row', async () => {
      // Arrange
      // insert role → returning → empty (role insert failed, logger.warn is called, continue)
      const tx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([]), // no role returned
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      }
      const repo = new DrizzleRbacRepository({} as never)

      // Act — should not throw
      await expect(
        repo.seedDefaultRoles(
          'org-1',
          [{ name: 'Admin', slug: 'admin', description: null, permissions: ['users:read'] }],
          tx as never
        )
      ).resolves.toBeUndefined()
    })

    it('should skip insertRolePermissions when no permissions match', async () => {
      // Arrange
      // Step 1: insert role → returning → role row
      // Step 2: select().from(permissions) → no permissions → no matching inserts → skip step 3
      const tx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockResolvedValueOnce([]), // permissions list is empty
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([{ id: 'role-1' }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      }
      const repo = new DrizzleRbacRepository({} as never)

      // Act
      await repo.seedDefaultRoles(
        'org-1',
        [{ name: 'Admin', slug: 'admin', description: null, permissions: ['users:read'] }],
        tx as never
      )

      // Assert: values only called once (for role insert), not again for permissions (empty inserts)
      expect(tx.values).toHaveBeenCalledTimes(1)
      expect(tx.insert).toHaveBeenCalledTimes(1)
    })
  })
})
