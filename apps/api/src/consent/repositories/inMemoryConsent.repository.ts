import type { ConsentRecord } from '@repo/types'
import type { DrizzleTx } from '../../database/drizzle.provider.js'
import type { ConsentRepository, SaveConsentDto } from '../consent.repository.js'
import { ConsentNotFoundException } from '../exceptions/consentNotFound.exception.js'

export class InMemoryConsentRepository implements ConsentRepository {
  private readonly store = new Map<string, ConsentRecord[]>()

  async saveConsent(userId: string, dto: SaveConsentDto, _tx?: DrizzleTx): Promise<ConsentRecord> {
    // ipAddress and userAgent are audit-only DB fields — not part of ConsentRecord; intentionally omitted
    const now = new Date().toISOString()
    const record: ConsentRecord = {
      id: crypto.randomUUID(),
      userId,
      categories: dto.categories,
      policyVersion: dto.policyVersion,
      action: dto.action,
      createdAt: now,
      updatedAt: now,
    }
    const existing = this.store.get(userId) ?? []
    this.store.set(userId, [...existing, record])
    return record
  }

  async getLatestByUserId(userId: string, _tx?: DrizzleTx): Promise<ConsentRecord> {
    const records = this.store.get(userId) ?? []
    const latest = records.at(-1)
    if (!latest) throw new ConsentNotFoundException(userId)
    return latest
  }

  clear(): void {
    this.store.clear()
  }
}
