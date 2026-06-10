import { Inject, Injectable } from '@nestjs/common'
import { and, eq, isNotNull, lt } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import { invitations, members, organizations } from '../../database/schema/auth.schema.js'
import { roles } from '../../database/schema/rbac.schema.js'

export const ORGANIZATION_PURGE_REPO = Symbol('ORGANIZATION_PURGE_REPO')

export interface OrganizationPurgeRepository {
  findExpiredOrganizations(
    now: Date,
    tx?: DrizzleTx
  ): Promise<{ id: string; name: string; slug: string | null }[]>

  anonymizeOrganization(
    orgId: string,
    anonymizedSlug: string,
    now: Date,
    tx?: DrizzleTx
  ): Promise<void>
}

@Injectable()
export class DrizzleOrganizationPurgeRepository implements OrganizationPurgeRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findExpiredOrganizations(
    now: Date,
    tx?: DrizzleTx
  ): Promise<{ id: string; name: string; slug: string | null }[]> {
    const qb = tx ?? this.db
    return qb
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
  }

  async anonymizeOrganization(
    orgId: string,
    anonymizedSlug: string,
    now: Date,
    tx?: DrizzleTx
  ): Promise<void> {
    const qb = tx ?? this.db

    // Anonymize organization record
    await qb
      .update(organizations)
      .set({
        name: 'Deleted Organization',
        slug: anonymizedSlug,
        logo: null,
        metadata: null,
        updatedAt: now,
      })
      .where(eq(organizations.id, orgId))

    // Delete all members for this org
    await qb.delete(members).where(eq(members.organizationId, orgId))

    // Delete all invitations for this org
    await qb.delete(invitations).where(eq(invitations.organizationId, orgId))

    // Delete tenant-scoped custom roles (cascade handles role_permissions)
    await qb.delete(roles).where(eq(roles.tenantId, orgId))
  }
}
