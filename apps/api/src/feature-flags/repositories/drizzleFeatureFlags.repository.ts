// RLS-BYPASS: superadmin-only endpoint — @Roles('superadmin') enforced at controller level
import { Inject, Injectable } from '@nestjs/common'
import type { FeatureFlag } from '@repo/types'
import { desc, eq } from 'drizzle-orm'
import { FeatureFlagCreateFailedException } from '../../admin/exceptions/featureFlagCreateFailed.exception.js'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import { featureFlags } from '../../database/schema/featureFlags.schema.js'
import type { FeatureFlagRepository } from '../featureFlags.repository.js'

function toFeatureFlag(row: typeof featureFlags.$inferSelect): FeatureFlag {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description ?? null,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

@Injectable()
export class DrizzleFeatureFlagRepository implements FeatureFlagRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByKey(key: string, tx?: DrizzleTx): Promise<FeatureFlag | null> {
    const qb = tx ?? this.db
    const rows = await qb.select().from(featureFlags).where(eq(featureFlags.key, key)).limit(1)
    return rows[0] ? toFeatureFlag(rows[0]) : null
  }

  async findAll(tx?: DrizzleTx): Promise<FeatureFlag[]> {
    const qb = tx ?? this.db
    const rows = await qb.select().from(featureFlags).orderBy(desc(featureFlags.createdAt))
    return rows.map(toFeatureFlag)
  }

  async findById(id: string, tx?: DrizzleTx): Promise<FeatureFlag | null> {
    const qb = tx ?? this.db
    const rows = await qb.select().from(featureFlags).where(eq(featureFlags.id, id)).limit(1)
    return rows[0] ? toFeatureFlag(rows[0]) : null
  }

  async create(
    data: { name: string; key: string; description?: string },
    tx?: DrizzleTx
  ): Promise<FeatureFlag> {
    const qb = tx ?? this.db
    const rows = await qb
      .insert(featureFlags)
      .values({
        name: data.name,
        key: data.key,
        description: data.description,
      })
      .returning()
    const row = rows[0]
    if (!row) throw new FeatureFlagCreateFailedException()
    return toFeatureFlag(row)
  }

  async update(
    id: string,
    data: { name?: string; description?: string; enabled?: boolean },
    tx?: DrizzleTx
  ): Promise<FeatureFlag | null> {
    const qb = tx ?? this.db
    const rows = await qb.update(featureFlags).set(data).where(eq(featureFlags.id, id)).returning()
    return rows[0] ? toFeatureFlag(rows[0]) : null
  }

  async delete(id: string, tx?: DrizzleTx): Promise<FeatureFlag | null> {
    const qb = tx ?? this.db
    const rows = await qb.delete(featureFlags).where(eq(featureFlags.id, id)).returning()
    return rows[0] ? toFeatureFlag(rows[0]) : null
  }
}
