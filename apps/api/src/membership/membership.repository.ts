import type { DrizzleTx } from '../database/drizzle.provider.js'

export const MEMBERSHIP_REPO = Symbol('MEMBERSHIP_REPO')

export interface MembershipRepository {
  getOwnedOrganizations(
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ orgId: string; orgName: string; orgSlug: string | null }[]>

  verifyOrgOwnership(
    orgId: string,
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ role: string } | undefined>

  verifyTargetMember(
    orgId: string,
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ id: string } | undefined>

  transferOrgOwnership(
    orgId: string,
    targetUserId: string,
    now: Date,
    tx?: DrizzleTx
  ): Promise<void>

  softDeleteOrg(orgId: string, now: Date, deleteScheduledFor: Date, tx?: DrizzleTx): Promise<void>

  clearOrgSessions(orgId: string, tx?: DrizzleTx): Promise<void>

  expireOrgInvitations(orgId: string, tx?: DrizzleTx): Promise<void>

  deleteUserSessions(userId: string, tx?: DrizzleTx): Promise<void>

  transaction<T>(fn: (tx: DrizzleTx) => Promise<T>): Promise<T>
}
