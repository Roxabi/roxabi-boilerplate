import { Inject, Injectable } from '@nestjs/common'
import type { ConsentRecord } from '@repo/types'
import { desc, eq } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import { consentRecords } from '../../database/schema/consent.schema.js'
import type { ConsentRepository, SaveConsentDto } from '../consent.repository.js'
import { ConsentInsertFailedException } from '../exceptions/consentInsertFailed.exception.js'
import { ConsentNotFoundException } from '../exceptions/consentNotFound.exception.js'

function toConsentRecord(row: typeof consentRecords.$inferSelect): ConsentRecord {
  return {
    id: row.id,
    userId: row.userId,
    categories: row.categories as ConsentRecord['categories'],
    policyVersion: row.policyVersion,
    action: row.action as ConsentRecord['action'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

@Injectable()
export class DrizzleConsentRepository implements ConsentRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async saveConsent(userId: string, dto: SaveConsentDto, tx?: DrizzleTx): Promise<ConsentRecord> {
    const qb = tx ?? this.db
    const rows = await qb
      .insert(consentRecords)
      .values({
        userId,
        categories: dto.categories,
        policyVersion: dto.policyVersion,
        action: dto.action,
        ipAddress: dto.ipAddress ?? null,
        userAgent: dto.userAgent ?? null,
      })
      .returning()
    const row = rows[0]
    if (!row) throw new ConsentInsertFailedException(userId)
    return toConsentRecord(row)
  }

  async getLatestByUserId(userId: string, tx?: DrizzleTx): Promise<ConsentRecord> {
    const qb = tx ?? this.db
    const [row] = await qb
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.userId, userId))
      .orderBy(desc(consentRecords.createdAt))
      .limit(1)
    if (!row) throw new ConsentNotFoundException(userId)
    return toConsentRecord(row)
  }
}
