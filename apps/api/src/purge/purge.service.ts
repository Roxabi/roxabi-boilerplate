import { Inject, Injectable, Logger } from '@nestjs/common'
import { USER_PURGE_REPO, type UserPurgeRepository } from '../user/userPurge.repository.js'
import { UserPurgeService } from '../user/userPurge.service.js'
import {
  ORGANIZATION_PURGE_REPO,
  type OrganizationPurgeRepository,
} from './repositories/organizationPurge.repository.js'

@Injectable()
export class PurgeService {
  private readonly logger = new Logger(PurgeService.name)

  constructor(
    @Inject(USER_PURGE_REPO) private readonly userPurgeRepo: UserPurgeRepository,
    @Inject(ORGANIZATION_PURGE_REPO) private readonly orgPurgeRepo: OrganizationPurgeRepository,
    private readonly userPurgeService: UserPurgeService
  ) {}

  async runPurge() {
    this.logger.log('Purge cron started')

    // Process users first, then organizations (per spec ordering)
    const usersAnonymized = await this.purgeUsers()
    const orgsAnonymized = await this.purgeOrganizations()

    this.logger.log(
      `Purge completed: ${usersAnonymized} users anonymized, ${orgsAnonymized} orgs anonymized`
    )

    return { usersAnonymized, orgsAnonymized }
  }

  private async purgeUsers(): Promise<number> {
    const now = new Date()

    const expiredUsers = await this.userPurgeRepo.findExpiredUsers(now)

    let anonymized = 0
    for (const user of expiredUsers) {
      if (user.email.endsWith('@anonymized.local')) continue

      await this.userPurgeService.anonymizeUserRecords(user.id, user.email, now)
      anonymized++
    }

    return anonymized
  }

  private async purgeOrganizations(): Promise<number> {
    const now = new Date()

    const expiredOrgs = await this.orgPurgeRepo.findExpiredOrganizations(now)

    let anonymized = 0
    for (const org of expiredOrgs) {
      // Idempotent: skip already-anonymized orgs
      if (org.slug?.startsWith('deleted-')) {
        continue
      }

      const anonymizedSlug = `deleted-${crypto.randomUUID()}`
      await this.orgPurgeRepo.anonymizeOrganization(org.id, anonymizedSlug, now)

      anonymized++
    }

    return anonymized
  }
}
