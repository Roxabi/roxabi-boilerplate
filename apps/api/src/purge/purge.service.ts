import { Inject, Injectable, Logger } from '@nestjs/common'
import { and, eq, isNotNull, lt } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider.js'
import { invitations, members, organizations, users } from '../database/schema/auth.schema.js'
import { roles } from '../database/schema/rbac.schema.js'
import { UserService } from '../user/user.service.js'

@Injectable()
export class PurgeService {
  private readonly logger = new Logger(PurgeService.name)

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly userService: UserService
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

    const expiredUsers = await this.db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(isNotNull(users.deleteScheduledFor), lt(users.deleteScheduledFor, now)))
      .limit(100)

    let anonymized = 0
    for (const user of expiredUsers) {
      if (user.email.endsWith('@anonymized.local')) continue

      await this.db.transaction(async (tx) => {
        await this.userService.anonymizeUserRecords(tx, user.id, user.email, now)
      })
      anonymized++
    }

    return anonymized
  }

  private async purgeOrganizations(): Promise<number> {
    const now = new Date()

    // Query organizations where deleteScheduledFor < NOW(), limit 100
    const expiredOrgs = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
      })
      .from(organizations)
      .where(
        and(isNotNull(organizations.deleteScheduledFor), lt(organizations.deleteScheduledFor, now))
      )
      .limit(100)

    let anonymized = 0
    for (const org of expiredOrgs) {
      // Idempotent: skip already-anonymized orgs
      if (org.slug?.startsWith('deleted-')) {
        continue
      }

      await this.db.transaction(async (tx) => {
        const anonymizedSlug = `deleted-${crypto.randomUUID()}`

        // Anonymize organization record
        await tx
          .update(organizations)
          .set({
            name: 'Deleted Organization',
            slug: anonymizedSlug,
            logo: null,
            metadata: null,
            updatedAt: now,
          })
          .where(eq(organizations.id, org.id))

        // Delete all members for this org
        await tx.delete(members).where(eq(members.organizationId, org.id))

        // Delete all invitations for this org
        await tx.delete(invitations).where(eq(invitations.organizationId, org.id))

        // Delete tenant-scoped custom roles (cascade handles role_permissions)
        await tx.delete(roles).where(eq(roles.tenantId, org.id))
      })

      anonymized++
    }

    return anonymized
  }
}
