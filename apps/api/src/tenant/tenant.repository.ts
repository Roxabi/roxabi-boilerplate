import type { DrizzleTx } from '../database/drizzle.provider.js'

export const TENANT_REPO = Symbol('TENANT_REPO')

export type OrganizationLookupRow = {
  id: string
  name: string
  slug: string | null
  logo: string | null
  metadata: Record<string, unknown> | null
  deletedAt: Date | null
  deleteScheduledFor: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface TenantRepository {
  lookupOrganization(orgId: string, tx?: DrizzleTx): Promise<OrganizationLookupRow | null>
}
