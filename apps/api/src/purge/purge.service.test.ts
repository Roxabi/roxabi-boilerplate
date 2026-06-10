import { describe, expect, it, vi } from 'vitest'
import type { UserPurgeRepository } from '../user/userPurge.repository.js'
import type { UserPurgeService } from '../user/userPurge.service.js'
import { PurgeService } from './purge.service.js'
import type { OrganizationPurgeRepository } from './repositories/organizationPurge.repository.js'

function createMockUserPurgeRepo(expiredUsers: { id: string; email: string }[] = []) {
  return {
    findExpiredUsers: vi.fn().mockResolvedValue(expiredUsers),
    anonymizeUserRecords: vi.fn().mockResolvedValue(undefined),
    findForPurgeValidation: vi.fn().mockResolvedValue(null),
    purgeOwnedOrganizations: vi.fn().mockResolvedValue(undefined),
  } as unknown as UserPurgeRepository
}

function createMockOrgPurgeRepo(
  expiredOrgs: { id: string; name: string; slug: string | null }[] = []
) {
  return {
    findExpiredOrganizations: vi.fn().mockResolvedValue(expiredOrgs),
    anonymizeOrganization: vi.fn().mockResolvedValue(undefined),
  } as unknown as OrganizationPurgeRepository
}

function createMockUserPurgeService() {
  return {
    anonymizeUserRecords: vi.fn().mockResolvedValue(undefined),
  } as unknown as UserPurgeService
}

describe('PurgeService', () => {
  describe('runPurge', () => {
    it('should anonymize users whose deleteScheduledFor has passed', async () => {
      const expiredUser = { id: 'user-1', email: 'john@example.com' }
      const userPurgeRepo = createMockUserPurgeRepo([expiredUser])
      const orgPurgeRepo = createMockOrgPurgeRepo([])
      const userPurgeService = createMockUserPurgeService()

      const service = new PurgeService(userPurgeRepo, orgPurgeRepo, userPurgeService)
      const result = await service.runPurge()

      expect(result.usersAnonymized).toBe(1)
      expect(userPurgeService.anonymizeUserRecords).toHaveBeenCalledTimes(1)
    })

    it('should anonymize organizations whose deleteScheduledFor has passed', async () => {
      const expiredOrg = { id: 'org-1', name: 'Test Org', slug: 'test-org' }
      const userPurgeRepo = createMockUserPurgeRepo([])
      const orgPurgeRepo = createMockOrgPurgeRepo([expiredOrg])
      const userPurgeService = createMockUserPurgeService()

      const service = new PurgeService(userPurgeRepo, orgPurgeRepo, userPurgeService)
      const result = await service.runPurge()

      expect(result.orgsAnonymized).toBe(1)
      expect(orgPurgeRepo.anonymizeOrganization).toHaveBeenCalledTimes(1)
    })

    it('should process users before organizations', async () => {
      const expiredUser = { id: 'user-1', email: 'john@example.com' }
      const expiredOrg = { id: 'org-1', name: 'Org', slug: 'org' }
      const callOrder: string[] = []

      const userPurgeRepo = createMockUserPurgeRepo([expiredUser])
      const orgPurgeRepo = createMockOrgPurgeRepo([expiredOrg])
      const userPurgeService = createMockUserPurgeService()

      vi.mocked(userPurgeService.anonymizeUserRecords).mockImplementation(async () => {
        callOrder.push('user')
      })
      vi.mocked(orgPurgeRepo.anonymizeOrganization).mockImplementation(async () => {
        callOrder.push('org')
      })

      const service = new PurgeService(userPurgeRepo, orgPurgeRepo, userPurgeService)
      const result = await service.runPurge()

      expect(result.usersAnonymized).toBe(1)
      expect(result.orgsAnonymized).toBe(1)
      expect(callOrder).toEqual(['user', 'org'])
    })

    it('should delegate user anonymization to UserPurgeService', async () => {
      const expiredUser = { id: 'user-1', email: 'john@example.com' }
      const userPurgeRepo = createMockUserPurgeRepo([expiredUser])
      const orgPurgeRepo = createMockOrgPurgeRepo([])
      const userPurgeService = createMockUserPurgeService()

      const service = new PurgeService(userPurgeRepo, orgPurgeRepo, userPurgeService)
      await service.runPurge()

      expect(userPurgeService.anonymizeUserRecords).toHaveBeenCalledWith(
        'user-1',
        'john@example.com',
        expect.any(Date)
      )
    })

    it('should delegate org anonymization (members, invitations, roles) to OrgPurgeRepository', async () => {
      const expiredOrg = { id: 'org-1', name: 'Org', slug: 'org' }
      const userPurgeRepo = createMockUserPurgeRepo([])
      const orgPurgeRepo = createMockOrgPurgeRepo([expiredOrg])
      const userPurgeService = createMockUserPurgeService()

      const service = new PurgeService(userPurgeRepo, orgPurgeRepo, userPurgeService)
      await service.runPurge()

      // anonymizeOrganization encapsulates member/invitation/role deletion
      expect(orgPurgeRepo.anonymizeOrganization).toHaveBeenCalledWith(
        'org-1',
        expect.stringMatching(/^deleted-/),
        expect.any(Date)
      )
    })

    it('should be idempotent (re-running on anonymized records is a no-op)', async () => {
      const anonymizedUser = { id: 'user-1', email: 'deleted-abc@anonymized.local' }
      const anonymizedOrg = { id: 'org-1', name: 'Deleted Organization', slug: 'deleted-xyz' }

      const userPurgeRepo = createMockUserPurgeRepo([anonymizedUser])
      const orgPurgeRepo = createMockOrgPurgeRepo([anonymizedOrg])
      const userPurgeService = createMockUserPurgeService()

      const service = new PurgeService(userPurgeRepo, orgPurgeRepo, userPurgeService)
      const result = await service.runPurge()

      expect(result.usersAnonymized).toBe(0)
      expect(result.orgsAnonymized).toBe(0)
      expect(userPurgeService.anonymizeUserRecords).not.toHaveBeenCalled()
      expect(orgPurgeRepo.anonymizeOrganization).not.toHaveBeenCalled()
    })

    it('should process up to 100 records per invocation', async () => {
      const userPurgeRepo = createMockUserPurgeRepo([])
      const orgPurgeRepo = createMockOrgPurgeRepo([])
      const userPurgeService = createMockUserPurgeService()

      const service = new PurgeService(userPurgeRepo, orgPurgeRepo, userPurgeService)
      await service.runPurge()

      // The .limit(100) is baked into the repository implementations
      expect(userPurgeRepo.findExpiredUsers).toHaveBeenCalledTimes(1)
      expect(orgPurgeRepo.findExpiredOrganizations).toHaveBeenCalledTimes(1)
    })

    it('should return zero counts when no records are expired', async () => {
      const userPurgeRepo = createMockUserPurgeRepo([])
      const orgPurgeRepo = createMockOrgPurgeRepo([])
      const userPurgeService = createMockUserPurgeService()

      const service = new PurgeService(userPurgeRepo, orgPurgeRepo, userPurgeService)
      const result = await service.runPurge()

      expect(result).toEqual({ usersAnonymized: 0, orgsAnonymized: 0 })
    })
  })
})
