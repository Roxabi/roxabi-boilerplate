import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import * as schema from '../../database/schema/index.js'
import type { OrganizationLookupRow, TenantRepository } from '../tenant.repository.js'

@Injectable()
export class DrizzleTenantRepository implements TenantRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async lookupOrganization(orgId: string, tx?: DrizzleTx): Promise<OrganizationLookupRow | null> {
    const qb = tx ?? this.db
    const [org] = await qb
      .select({
        id: schema.organizations.id,
        name: schema.organizations.name,
        slug: schema.organizations.slug,
        logo: schema.organizations.logo,
        metadata: schema.organizations.metadata,
        deletedAt: schema.organizations.deletedAt,
        deleteScheduledFor: schema.organizations.deleteScheduledFor,
        createdAt: schema.organizations.createdAt,
        updatedAt: schema.organizations.updatedAt,
      })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, orgId))
      .limit(1)

    if (!org) return null

    return {
      ...org,
      metadata: org.metadata != null ? (JSON.parse(org.metadata) as Record<string, unknown>) : null,
    }
  }
}
