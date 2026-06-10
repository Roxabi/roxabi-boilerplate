import { Inject, Injectable } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import { apiKeys } from '../../database/schema/apiKey.schema.js'
import { users } from '../../database/schema/auth.schema.js'
import type {
  ApiKeyInsertRow,
  ApiKeyListRow,
  ApiKeyRepository,
  ApiKeyRevokeRow,
  ApiKeyValidationRow,
} from '../apiKey.repository.js'

@Injectable()
export class DrizzleApiKeyRepository implements ApiKeyRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async insert(
    data: {
      id: string
      tenantId: string
      userId: string
      name: string
      keyPrefix: string
      keyHash: string
      keySalt: string
      lastFour: string
      scopes: string[]
      expiresAt: Date | null
    },
    tx?: DrizzleTx
  ): Promise<ApiKeyInsertRow | undefined> {
    const qb = tx ?? this.db
    const [inserted] = await qb.insert(apiKeys).values(data).returning({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      lastFour: apiKeys.lastFour,
      scopes: apiKeys.scopes,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    return inserted
  }

  async list(tenantId: string, tx?: DrizzleTx): Promise<ApiKeyListRow[]> {
    const qb = tx ?? this.db
    return qb
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        lastFour: apiKeys.lastFour,
        scopes: apiKeys.scopes,
        rateLimitTier: apiKeys.rateLimitTier,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.tenantId, tenantId))
      .orderBy(apiKeys.createdAt)
  }

  async findForRevoke(
    id: string,
    tenantId: string,
    tx?: DrizzleTx
  ): Promise<ApiKeyRevokeRow | undefined> {
    const qb = tx ?? this.db
    const [existing] = await qb
      .select({
        id: apiKeys.id,
        revokedAt: apiKeys.revokedAt,
      })
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, tenantId)))
      .limit(1)
    return existing
  }

  async markRevoked(id: string, tenantId: string, now: Date, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb
      .update(apiKeys)
      .set({ revokedAt: now })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, tenantId)))
  }

  async findCandidatesByLastFour(
    lastFour: string,
    tenantId: string | null,
    tx?: DrizzleTx
  ): Promise<ApiKeyValidationRow[]> {
    const qb = tx ?? this.db
    const conditions = [eq(apiKeys.lastFour, lastFour), isNull(users.deletedAt)]
    if (tenantId) {
      conditions.push(eq(apiKeys.tenantId, tenantId))
    }
    return qb
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        tenantId: apiKeys.tenantId,
        scopes: apiKeys.scopes,
        keyHash: apiKeys.keyHash,
        keySalt: apiKeys.keySalt,
        revokedAt: apiKeys.revokedAt,
        expiresAt: apiKeys.expiresAt,
        role: users.role,
      })
      .from(apiKeys)
      .innerJoin(users, eq(apiKeys.userId, users.id))
      .where(and(...conditions))
      .limit(10)
  }

  async touchLastUsedAt(id: string, tenantId: string, now: Date, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb
      .update(apiKeys)
      .set({ lastUsedAt: now })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, tenantId)))
  }

  async revokeAllForUser(userId: string, now: Date, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb
      .update(apiKeys)
      .set({ revokedAt: now })
      .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
  }

  async revokeAllForOrg(organizationId: string, now: Date, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb
      .update(apiKeys)
      .set({ revokedAt: now })
      .where(and(eq(apiKeys.tenantId, organizationId), isNull(apiKeys.revokedAt)))
  }
}
