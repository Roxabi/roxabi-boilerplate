import type { DrizzleTx } from '../database/drizzle.provider.js'

export const TENANT_REPO = Symbol('TENANT_REPO')

export interface TenantRepository {
  resolveTenantId(orgId: string, tx?: DrizzleTx): Promise<string>
}
