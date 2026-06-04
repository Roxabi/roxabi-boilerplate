import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import { sessions, users } from '../../database/schema/auth.schema.js'

export const GDPR_ANONYMIZATION_REPO = Symbol('GDPR_ANONYMIZATION_REPO')

export interface GdprAnonymizationRepository {
  deleteUserSessions(userId: string, tx?: DrizzleTx): Promise<void>
  deleteUserAccounts(userId: string, tx?: DrizzleTx): Promise<void>
}

@Injectable()
export class DrizzleGdprAnonymizationRepository implements GdprAnonymizationRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async deleteUserSessions(userId: string, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb.delete(sessions).where(eq(sessions.userId, userId))
  }

  async deleteUserAccounts(userId: string, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    // Accounts are cascaded when user is anonymized; this is a placeholder
    // for GDPR-specific account deletion if needed beyond the purge flow.
    await qb.delete(users).where(eq(users.id, userId))
  }
}
