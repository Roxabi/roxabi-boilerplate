import type { DrizzleTx } from '../database/drizzle.provider.js'
import type { featureFlags } from '../database/schema/featureFlags.schema.js'

export const FEATURE_FLAG_REPO = Symbol('FEATURE_FLAG_REPO')

export type FeatureFlagRow = typeof featureFlags.$inferSelect

export interface FeatureFlagRepository {
  findByKey(key: string, tx?: DrizzleTx): Promise<FeatureFlagRow | null>
  findAll(tx?: DrizzleTx): Promise<FeatureFlagRow[]>
  findById(id: string, tx?: DrizzleTx): Promise<FeatureFlagRow | null>
  create(
    data: { name: string; key: string; description?: string },
    tx?: DrizzleTx
  ): Promise<FeatureFlagRow>
  update(
    id: string,
    data: { name?: string; description?: string; enabled?: boolean },
    tx?: DrizzleTx
  ): Promise<FeatureFlagRow | null>
  delete(id: string, tx?: DrizzleTx): Promise<FeatureFlagRow | null>
}
