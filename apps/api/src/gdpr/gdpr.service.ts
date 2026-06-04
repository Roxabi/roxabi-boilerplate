import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  GDPR_EXPORT_REPO,
  type GdprExportRepository,
} from './repositories/gdprExport.repository.js'

const _EXPORT_QUERY_LIMIT = 10_000

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

  constructor(@Inject(GDPR_EXPORT_REPO) private readonly exportRepo: GdprExportRepository) {}

  async exportUserData(userId: string): Promise<GdprExportData> {
    this.logger.log(`GDPR export requested for userId=${userId}`)

    const [userData, sessionData, accountData, orgData, consentData] =
      await this.exportRepo.fetchCoreUserData(userId)

    const user = userData[0]
    const invitationData = user?.email
      ? await this.exportRepo.fetchAndDeduplicateInvitations(userId, user.email)
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
