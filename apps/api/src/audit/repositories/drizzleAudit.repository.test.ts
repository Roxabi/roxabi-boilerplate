import { describe, expect, it, vi } from 'vitest'
import type { AuditLogEntry } from '../audit.repository.js'
import { DrizzleAuditRepository } from './drizzleAudit.repository.js'

function createMockDb() {
  const valuesFn = vi.fn().mockResolvedValue(undefined)
  const insertFn = vi.fn().mockReturnValue({ values: valuesFn })
  return { db: { insert: insertFn }, chains: { insert: { values: valuesFn } } }
}

describe('DrizzleAuditRepository', () => {
  describe('create', () => {
    it('should insert an audit log entry with null-coalesced optional fields', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      const repo = new DrizzleAuditRepository(db as never)

      const entry: AuditLogEntry = {
        actorId: 'user-1',
        actorType: 'user',
        action: 'member.invited',
        resource: 'invitation',
        resourceId: 'inv-1',
      }

      // Act
      await repo.create(entry)

      // Assert
      expect(db.insert).toHaveBeenCalled()
      expect(chains.insert.values).toHaveBeenCalledWith({
        actorId: 'user-1',
        actorType: 'user',
        impersonatorId: null,
        organizationId: null,
        action: 'member.invited',
        resource: 'invitation',
        resourceId: 'inv-1',
        before: null,
        after: null,
        metadata: null,
        apiKeyId: null,
      })
    })

    it('should pass through provided optional fields', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      const repo = new DrizzleAuditRepository(db as never)

      const entry: AuditLogEntry = {
        actorId: 'admin-1',
        actorType: 'impersonation',
        impersonatorId: 'superadmin-1',
        organizationId: 'org-2',
        action: 'member.role_changed',
        resource: 'member',
        resourceId: 'member-1',
        before: { roleSlug: 'member' },
        after: { roleSlug: 'admin' },
        metadata: { reason: 'promotion' },
        apiKeyId: 'key-1',
      }

      // Act
      await repo.create(entry)

      // Assert
      expect(chains.insert.values).toHaveBeenCalledWith({
        actorId: 'admin-1',
        actorType: 'impersonation',
        impersonatorId: 'superadmin-1',
        organizationId: 'org-2',
        action: 'member.role_changed',
        resource: 'member',
        resourceId: 'member-1',
        before: { roleSlug: 'member' },
        after: { roleSlug: 'admin' },
        metadata: { reason: 'promotion' },
        apiKeyId: 'key-1',
      })
    })

    it('should propagate database errors', async () => {
      // Arrange
      const { db, chains } = createMockDb()
      chains.insert.values.mockRejectedValue(new Error('DB connection lost'))
      const repo = new DrizzleAuditRepository(db as never)

      // Act & Assert
      await expect(
        repo.create({
          actorId: 'user-1',
          actorType: 'user',
          action: 'member.invited',
          resource: 'invitation',
          resourceId: 'inv-1',
        })
      ).rejects.toThrow('DB connection lost')
    })
  })
})
