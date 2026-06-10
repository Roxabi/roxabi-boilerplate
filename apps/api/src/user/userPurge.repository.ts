import type { DrizzleTx } from '../database/drizzle.provider.js'

export const USER_PURGE_REPO = Symbol('USER_PURGE_REPO')

export interface UserPurgeRepository {
  findForPurgeValidation(
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ id: string; email: string; deletedAt: Date | null } | null>

  findExpiredUsers(now: Date, tx?: DrizzleTx): Promise<{ id: string; email: string }[]>

  anonymizeUserRecords(
    userId: string,
    originalEmail: string,
    now: Date,
    tx?: DrizzleTx
  ): Promise<void>

  purgeOwnedOrganizations(userId: string, now: Date, tx?: DrizzleTx): Promise<void>
}
