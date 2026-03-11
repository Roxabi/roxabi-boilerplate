import type { FeatureFlag } from '@repo/types'
import type { DrizzleTx } from '../database/drizzle.provider.js'

export const FEATURE_FLAG_REPO = Symbol('FEATURE_FLAG_REPO')

export interface FeatureFlagRepository {
  findByKey(key: string, tx?: DrizzleTx): Promise<FeatureFlag | null>
  findAll(tx?: DrizzleTx): Promise<FeatureFlag[]>
  findById(id: string, tx?: DrizzleTx): Promise<FeatureFlag | null>
  create(
    data: { name: string; key: string; description?: string },
    tx?: DrizzleTx
  ): Promise<FeatureFlag>
  update(
    id: string,
    data: { name?: string; description?: string; enabled?: boolean },
    tx?: DrizzleTx
  ): Promise<FeatureFlag | null>
  delete(id: string, tx?: DrizzleTx): Promise<FeatureFlag | null>
}
