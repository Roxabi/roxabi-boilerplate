import type { DrizzleTx } from '../database/drizzle.provider.js'

export const API_KEY_REPO = Symbol('API_KEY_REPO')

export type ApiKeyListRow = {
  id: string
  name: string
  keyPrefix: string
  lastFour: string
  scopes: string[]
  rateLimitTier: string
  expiresAt: Date | null
  lastUsedAt: Date | null
  revokedAt: Date | null
  createdAt: Date
}

export type ApiKeyInsertRow = {
  id: string
  name: string
  keyPrefix: string
  lastFour: string
  scopes: string[]
  expiresAt: Date | null
  createdAt: Date
}

export type ApiKeyValidationRow = {
  id: string
  userId: string
  tenantId: string
  scopes: string[]
  keyHash: string
  keySalt: string
  revokedAt: Date | null
  expiresAt: Date | null
  role: string | null
}

export type ApiKeyRevokeRow = {
  id: string
  revokedAt: Date | null
}

export interface ApiKeyRepository {
  insert(
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
  ): Promise<ApiKeyInsertRow | undefined>

  list(tenantId: string, tx?: DrizzleTx): Promise<ApiKeyListRow[]>

  findForRevoke(id: string, tenantId: string, tx?: DrizzleTx): Promise<ApiKeyRevokeRow | undefined>

  markRevoked(id: string, tenantId: string, now: Date, tx?: DrizzleTx): Promise<void>

  findCandidatesByLastFour(
    lastFour: string,
    tenantId: string | null,
    tx?: DrizzleTx
  ): Promise<ApiKeyValidationRow[]>

  touchLastUsedAt(id: string, tenantId: string, now: Date, tx?: DrizzleTx): Promise<void>

  revokeAllForUser(userId: string, now: Date, tx?: DrizzleTx): Promise<void>

  revokeAllForOrg(organizationId: string, now: Date, tx?: DrizzleTx): Promise<void>
}
