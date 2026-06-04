import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import { whereActive } from '../../database/helpers/whereActive.js'
import {
  accounts,
  invitations,
  members,
  organizations,
  sessions,
  users,
} from '../../database/schema/auth.schema.js'
import { consentRecords } from '../../database/schema/consent.schema.js'
import type {
  GdprAccountData,
  GdprConsentData,
  GdprInvitationData,
  GdprOrganizationData,
  GdprSessionData,
  GdprUserData,
} from '../../gdpr/gdpr.service.js'

const EXPORT_QUERY_LIMIT = 10_000

export const GDPR_EXPORT_REPO = Symbol('GDPR_EXPORT_REPO')

export interface GdprExportRepository {
  fetchUserRecord(userId: string, tx?: DrizzleTx): Promise<GdprUserData[]>

  fetchCoreUserData(
    userId: string,
    tx?: DrizzleTx
  ): Promise<
    [
      GdprUserData[],
      GdprSessionData[],
      GdprAccountData[],
      GdprOrganizationData[],
      GdprConsentData[],
    ]
  >

  fetchAndDeduplicateInvitations(
    userId: string,
    userEmail: string,
    tx?: DrizzleTx
  ): Promise<GdprInvitationData[]>
}

@Injectable()
export class DrizzleGdprExportRepository implements GdprExportRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  fetchUserRecord(userId: string, tx?: DrizzleTx): Promise<GdprUserData[]> {
    const qb = tx ?? this.db
    return qb
      .select({
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  }

  async fetchCoreUserData(
    userId: string,
    tx?: DrizzleTx
  ): Promise<
    [
      GdprUserData[],
      GdprSessionData[],
      GdprAccountData[],
      GdprOrganizationData[],
      GdprConsentData[],
    ]
  > {
    const qb = tx ?? this.db
    return await Promise.all([
      this.fetchUserRecord(userId, tx),
      qb
        .select({
          ipAddress: sessions.ipAddress,
          userAgent: sessions.userAgent,
          createdAt: sessions.createdAt,
          expiresAt: sessions.expiresAt,
        })
        .from(sessions)
        .where(eq(sessions.userId, userId))
        .limit(EXPORT_QUERY_LIMIT),
      qb
        .select({
          providerId: accounts.providerId,
          scope: accounts.scope,
          createdAt: accounts.createdAt,
        })
        .from(accounts)
        .where(eq(accounts.userId, userId))
        .limit(EXPORT_QUERY_LIMIT),
      qb
        .select({
          name: organizations.name,
          role: members.role,
          joinedAt: members.createdAt,
        })
        .from(members)
        .innerJoin(organizations, eq(members.organizationId, organizations.id))
        .where(and(eq(members.userId, userId), whereActive(members))),
      qb
        .select({
          categories: consentRecords.categories,
          action: consentRecords.action,
          consentedAt: consentRecords.createdAt,
          policyVersion: consentRecords.policyVersion,
        })
        .from(consentRecords)
        .where(eq(consentRecords.userId, userId))
        .limit(EXPORT_QUERY_LIMIT),
    ])
  }

  async fetchAndDeduplicateInvitations(
    userId: string,
    userEmail: string,
    tx?: DrizzleTx
  ): Promise<GdprInvitationData[]> {
    const qb = tx ?? this.db
    const [sentInvitations, receivedInvitations] = await Promise.all([
      qb
        .select({
          email: invitations.email,
          organizationName: organizations.name,
          role: invitations.role,
          status: invitations.status,
        })
        .from(invitations)
        .innerJoin(organizations, eq(invitations.organizationId, organizations.id))
        .where(eq(invitations.inviterId, userId)),

      qb
        .select({
          email: invitations.email,
          organizationName: organizations.name,
          role: invitations.role,
          status: invitations.status,
        })
        .from(invitations)
        .innerJoin(organizations, eq(invitations.organizationId, organizations.id))
        .where(eq(invitations.email, userEmail)),
    ])

    const sentKeys = new Set(sentInvitations.map((i) => `${i.organizationName}-${i.email}`))

    return [
      ...sentInvitations.map((i) => ({ ...i, direction: 'sent' as const })),
      ...receivedInvitations
        .filter((i) => !sentKeys.has(`${i.organizationName}-${i.email}`))
        .map((i) => ({ ...i, direction: 'received' as const })),
    ]
  }
}
