import type { DrizzleTx } from '../database/drizzle.provider.js'

export const ORG_REPO = Symbol('ORG_REPO')

export type OrgListRow = {
  id: string
  name: string
  slug: string | null
  logo: string | null
  createdAt: Date
}

export type OrgSoftDeleteRow = {
  id: string
  name: string
  slug: string | null
  deletedAt: Date | null
  deleteScheduledFor: Date | null
}

export type OrgFindRow = {
  id: string
  name: string
}

export type OrgOwnershipRow = {
  role: string
}

export type OrgDeletionImpact = {
  memberCount: number
  invitationCount: number
  customRoleCount: number
}

export interface OrgRepository {
  listForUser(userId: string, tx?: DrizzleTx): Promise<OrgListRow[]>

  findActiveOrg(orgId: string, tx?: DrizzleTx): Promise<OrgFindRow | undefined>

  findOrgForReactivate(
    orgId: string,
    tx?: DrizzleTx
  ): Promise<{ id: string; deletedAt: Date | null } | undefined>

  checkOwnership(
    orgId: string,
    userId: string,
    tx?: DrizzleTx
  ): Promise<OrgOwnershipRow | undefined>

  softDeleteOrg(
    orgId: string,
    now: Date,
    deleteScheduledFor: Date,
    tx?: DrizzleTx
  ): Promise<OrgSoftDeleteRow | undefined>

  clearOrgSessions(orgId: string, tx?: DrizzleTx): Promise<void>

  expireOrgInvitations(orgId: string, tx?: DrizzleTx): Promise<void>

  reactivateOrg(orgId: string, now: Date, tx?: DrizzleTx): Promise<OrgSoftDeleteRow | undefined>

  getDeletionImpact(orgId: string, tx?: DrizzleTx): Promise<OrgDeletionImpact>

  transaction<T>(fn: (tx: DrizzleTx) => Promise<T>): Promise<T>
}
