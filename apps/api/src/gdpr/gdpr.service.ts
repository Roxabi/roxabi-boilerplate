import { Inject, Injectable, Logger } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider.js'
import { whereActive } from '../database/helpers/whereActive.js'
import {
  accounts,
  invitations,
  members,
  organizations,
  sessions,
  users,
} from '../database/schema/auth.schema.js'
import { consentRecords } from '../database/schema/consent.schema.js'

const EXPORT_QUERY_LIMIT = 10_000

interface GdprUserData {
  name: string
  email: string
  image: string | null
  role: string | null
  emailVerified: boolean
  createdAt: Date | null
}

interface GdprSessionData {
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date | null
  expiresAt: Date
}

interface GdprAccountData {
  providerId: string
  scope: string | null
  createdAt: Date | null
}

interface GdprOrganizationData {
  name: string
  role: string
  joinedAt: Date | null
}

interface GdprInvitationData {
  email: string
  organizationName: string
  role: string
  status: string
  direction: 'sent' | 'received'
}

interface GdprConsentData {
  categories: unknown
  action: string
  consentedAt: Date | null
  policyVersion: string
}

export interface GdprExportData {
  exportedAt: string
  user: GdprUserData | Record<string, never>
  sessions: GdprSessionData[]
  accounts: GdprAccountData[]
  organizations: GdprOrganizationData[]
  invitations: GdprInvitationData[]
  consent: GdprConsentData[]
}

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name)

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {} // RLS-BYPASS: GDPR export — cross-tenant data access

  private fetchUserRecord(userId: string): Promise<GdprUserData[]> {
    return this.db
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

  private async fetchCoreUserData(
    userId: string
  ): Promise<
    [
      GdprUserData[],
      GdprSessionData[],
      GdprAccountData[],
      GdprOrganizationData[],
      GdprConsentData[],
    ]
  > {
    return await Promise.all([
      this.fetchUserRecord(userId),
      this.db
        .select({
          ipAddress: sessions.ipAddress,
          userAgent: sessions.userAgent,
          createdAt: sessions.createdAt,
          expiresAt: sessions.expiresAt,
        })
        .from(sessions)
        .where(eq(sessions.userId, userId))
        .limit(EXPORT_QUERY_LIMIT),
      this.db
        .select({
          providerId: accounts.providerId,
          scope: accounts.scope,
          createdAt: accounts.createdAt,
        })
        .from(accounts)
        .where(eq(accounts.userId, userId))
        .limit(EXPORT_QUERY_LIMIT),
      this.db
        .select({
          name: organizations.name,
          role: members.role,
          joinedAt: members.createdAt,
        })
        .from(members)
        .innerJoin(organizations, eq(members.organizationId, organizations.id))
        .where(and(eq(members.userId, userId), whereActive(members))),
      this.db
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

  private async fetchAndDeduplicateInvitations(
    userId: string,
    userEmail: string
  ): Promise<GdprInvitationData[]> {
    const [sentInvitations, receivedInvitations] = await Promise.all([
      this.db
        .select({
          email: invitations.email,
          organizationName: organizations.name,
          role: invitations.role,
          status: invitations.status,
        })
        .from(invitations)
        .innerJoin(organizations, eq(invitations.organizationId, organizations.id))
        .where(eq(invitations.inviterId, userId)),

      this.db
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

  async exportUserData(userId: string): Promise<GdprExportData> {
    this.logger.log(`GDPR export requested for userId=${userId}`)

    const [userData, sessionData, accountData, orgData, consentData] =
      await this.fetchCoreUserData(userId)

    const user = userData[0]
    const invitationData = user?.email
      ? await this.fetchAndDeduplicateInvitations(userId, user.email)
      : []

    this.logger.log(
      `GDPR export completed for userId=${userId}: ${sessionData.length} sessions, ${accountData.length} accounts, ${orgData.length} orgs, ${invitationData.length} invitations, ${consentData.length} consent records`
    )

    return {
      exportedAt: new Date().toISOString(),
      user: user ?? {},
      sessions: sessionData,
      accounts: accountData,
      organizations: orgData,
      invitations: invitationData,
      consent: consentData,
    }
  }
}
