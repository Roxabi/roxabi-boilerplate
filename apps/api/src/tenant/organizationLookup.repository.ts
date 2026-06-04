import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../database/drizzle.provider.js'
import { organizations } from '../database/schema/auth.schema.js'

export const ORGANIZATION_LOOKUP_REPO = Symbol('ORGANIZATION_LOOKUP_REPO')

export type OrganizationLookupResult = {
  id: string
  name: string
  slug: string | null
  logo: string | null
  metadata: unknown | null
  deletedAt: Date | null
  deleteScheduledFor: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationLookupRepository {
  findById(orgId: string, tx?: DrizzleTx): Promise<OrganizationLookupResult | null>
}

@Injectable()
export class DrizzleOrganizationLookupRepository implements OrganizationLookupRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(orgId: string, tx?: DrizzleTx): Promise<OrganizationLookupResult | null> {
    const qb = tx ?? this.db
    const [org] = await qb
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        metadata: organizations.metadata,
        deletedAt: organizations.deletedAt,
        deleteScheduledFor: organizations.deleteScheduledFor,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)

    return org ?? null
  }
}
