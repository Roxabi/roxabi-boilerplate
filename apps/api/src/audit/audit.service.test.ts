import type { Mock } from 'vitest'
import { describe, expect, it, vi } from 'vitest'
import type { AuditRepository } from './audit.repository.js'
import { AuditService } from './audit.service.js'

function createMockRepo() {
  return {
    create: vi.fn().mockResolvedValue(undefined),
  } satisfies Record<keyof AuditRepository, Mock>
}

describe('AuditService', () => {
  describe('log()', () => {
    it('should insert an audit log entry with all required fields', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      const service = new AuditService(mockRepo as AuditRepository)
      const entry = {
        actorId: 'user-1',
        actorType: 'user' as const,
        organizationId: 'org-1',
        action: 'member.invited' as const,
        resource: 'invitation',
        resourceId: 'inv-1',
      }

      // Act
      await service.log(entry)

      // Assert
      expect(mockRepo.create).toHaveBeenCalledOnce()
      expect(mockRepo.create).toHaveBeenCalledWith({
        actorId: 'user-1',
        actorType: 'user',
        organizationId: 'org-1',
        action: 'member.invited',
        resource: 'invitation',
        resourceId: 'inv-1',
      })
    })

    it('should pass optional fields when provided', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      const service = new AuditService(mockRepo as AuditRepository)
      const entry = {
        actorId: 'admin-1',
        actorType: 'impersonation' as const,
        impersonatorId: 'superadmin-1',
        organizationId: 'org-2',
        action: 'member.role_changed' as const,
        resource: 'member',
        resourceId: 'member-1',
        before: { roleId: 'r-old', roleSlug: 'member' },
        after: { roleId: 'r-new', roleSlug: 'admin' },
        metadata: { reason: 'promotion' },
      }

      // Act
      await service.log(entry)

      // Assert
      expect(mockRepo.create).toHaveBeenCalledWith({
        actorId: 'admin-1',
        actorType: 'impersonation',
        impersonatorId: 'superadmin-1',
        organizationId: 'org-2',
        action: 'member.role_changed',
        resource: 'member',
        resourceId: 'member-1',
        before: { roleId: 'r-old', roleSlug: 'member' },
        after: { roleId: 'r-new', roleSlug: 'admin' },
        metadata: { reason: 'promotion' },
      })
    })

    it('should pass entry as-is to repo — impersonatorId undefined when omitted', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      const service = new AuditService(mockRepo as AuditRepository)

      // Act
      await service.log({
        actorId: 'user-1',
        actorType: 'user' as const,
        action: 'member.removed' as const,
        resource: 'member',
        resourceId: 'member-1',
      })

      // Assert
      const calledWith = mockRepo.create.mock.calls[0]?.[0] as Record<string, unknown>
      expect(calledWith.impersonatorId).toBeUndefined()
    })

    it('should pass entry as-is to repo — organizationId undefined when omitted', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      const service = new AuditService(mockRepo as AuditRepository)

      // Act
      await service.log({
        actorId: 'user-1',
        actorType: 'user' as const,
        action: 'member.removed' as const,
        resource: 'member',
        resourceId: 'member-1',
      })

      // Assert
      const calledWith = mockRepo.create.mock.calls[0]?.[0] as Record<string, unknown>
      expect(calledWith.organizationId).toBeUndefined()
    })

    it('should pass entry as-is to repo — before, after, metadata undefined when omitted', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      const service = new AuditService(mockRepo as AuditRepository)

      // Act
      await service.log({
        actorId: 'user-1',
        actorType: 'user' as const,
        action: 'member.invited' as const,
        resource: 'invitation',
        resourceId: 'inv-1',
      })

      // Assert
      const calledWith = mockRepo.create.mock.calls[0]?.[0] as Record<string, unknown>
      expect(calledWith.before).toBeUndefined()
      expect(calledWith.after).toBeUndefined()
      expect(calledWith.metadata).toBeUndefined()
    })

    it('should handle explicit null values for optional fields', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      const service = new AuditService(mockRepo as AuditRepository)

      // Act
      await service.log({
        actorId: 'user-1',
        actorType: 'user' as const,
        impersonatorId: undefined,
        organizationId: undefined,
        action: 'member.invited' as const,
        resource: 'invitation',
        resourceId: 'inv-1',
        before: null,
        after: null,
        metadata: null,
      })

      // Assert
      const calledWith = mockRepo.create.mock.calls[0]?.[0] as Record<string, unknown>
      expect(calledWith.impersonatorId).toBeUndefined()
      expect(calledWith.organizationId).toBeUndefined()
      expect(calledWith.before).toBeNull()
      expect(calledWith.after).toBeNull()
      expect(calledWith.metadata).toBeNull()
    })

    it('should propagate database errors', async () => {
      // Arrange
      const mockRepo = createMockRepo()
      mockRepo.create.mockRejectedValue(new Error('DB connection lost'))
      const service = new AuditService(mockRepo as AuditRepository)

      // Act & Assert
      await expect(
        service.log({
          actorId: 'user-1',
          actorType: 'user' as const,
          action: 'member.invited' as const,
          resource: 'invitation',
          resourceId: 'inv-1',
        })
      ).rejects.toThrow('DB connection lost')
    })
  })
})
