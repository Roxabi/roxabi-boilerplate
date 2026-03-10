import type { ConsentRecord } from '@repo/types'
import type { DrizzleTx } from '../database/drizzle.provider.js'

export const CONSENT_REPO = Symbol('CONSENT_REPO')

export interface SaveConsentDto {
  categories: { necessary: true; analytics: boolean; marketing: boolean }
  policyVersion: string
  action: 'accepted' | 'rejected' | 'customized'
  ipAddress?: string | null
  userAgent?: string | null
}

export interface ConsentRepository {
  saveConsent(userId: string, dto: SaveConsentDto, tx?: DrizzleTx): Promise<ConsentRecord>
  getLatestByUserId(userId: string, tx?: DrizzleTx): Promise<ConsentRecord>
}
