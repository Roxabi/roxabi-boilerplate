import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'
import { ClsService } from 'nestjs-cls'
import { AuditService } from '../audit/audit.service.js'
import type { AuthenticatedSession } from '../auth/types.js'
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider.js'
import { apiKeys } from '../database/schema/apiKey.schema.js'
import { users } from '../database/schema/auth.schema.js'
import { ApiKeyExpiryInPastException } from './exceptions/apiKeyExpiryInPast.exception.js'
import { ApiKeyInvalidException } from './exceptions/apiKeyInvalid.exception.js'
import { ApiKeyNotFoundException } from './exceptions/apiKeyNotFound.exception.js'
import { ApiKeyScopesExceededException } from './exceptions/apiKeyScopesExceeded.exception.js'

const KEY_PREFIX = 'sk_live_'
const BASE62_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const KEY_LENGTH = 32
const SALT_BYTES = 16

function generateBase62(length: number): string {
  const bytes = randomBytes(length)
  let result = ''
  for (let i = 0; i < length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: bytes length matches length parameter
    result += BASE62_CHARS[bytes[i]! % BASE62_CHARS.length]
  }
  return result
}

function hmacHash(key: string, salt: string): string {
  return createHmac('sha256', salt).update(key).digest('hex')
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name)

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly auditService: AuditService,
    private readonly cls: ClsService
  ) {}

  async create(
    session: AuthenticatedSession,
    dto: { name: string; scopes: string[]; expiresAt?: string | null }
  ) {
    const orgId = this.requireOrgId(session)
    this.validateScopes(dto.scopes, session.permissions)
    const expiresAt = this.parseExpiresAt(dto.expiresAt)

    const { fullKey, lastFour, salt, hash } = this.generateKeyMaterial()
    const id = crypto.randomUUID()

    const [inserted] = await this.db
      .insert(apiKeys)
      .values({
        id,
        tenantId: orgId,
        userId: session.user.id,
        name: dto.name,
        keyPrefix: KEY_PREFIX,
        keyHash: hash,
        keySalt: salt,
        lastFour,
        scopes: dto.scopes,
        expiresAt,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        lastFour: apiKeys.lastFour,
        scopes: apiKeys.scopes,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })

    this.logAudit(session.user.id, orgId, 'api_key.created', id, {
      after: { name: dto.name, scopes: dto.scopes, expiresAt: expiresAt?.toISOString() ?? null },
    })

    return { ...inserted, key: fullKey }
  }

  private requireOrgId(session: AuthenticatedSession): string {
    const orgId = session.session.activeOrganizationId
    if (!orgId) throw new BadRequestException('Active organization required')
    return orgId
  }

  private validateScopes(scopes: string[], permissions: string[]) {
    const invalid = scopes.filter((s) => !permissions.includes(s))
    if (invalid.length > 0) throw new ApiKeyScopesExceededException()
  }

  private parseExpiresAt(value?: string | null): Date | null {
    if (!value) return null
    const date = new Date(value)
    if (date <= new Date()) throw new ApiKeyExpiryInPastException()
    return date
  }

  private generateKeyMaterial() {
    const randomPart = generateBase62(KEY_LENGTH)
    const fullKey = `${KEY_PREFIX}${randomPart}`
    const lastFour = fullKey.slice(-4)
    const salt = randomBytes(SALT_BYTES).toString('hex')
    const hash = hmacHash(fullKey, salt)
    return { fullKey, lastFour, salt, hash }
  }

  private logAudit(
    actorId: string,
    orgId: string,
    action: 'api_key.created' | 'api_key.revoked',
    apiKeyId: string,
    extra?: { after?: Record<string, unknown> }
  ) {
    this.auditService
      .log({
        actorId,
        actorType: 'user',
        organizationId: orgId,
        action,
        resource: 'api_key',
        resourceId: apiKeyId,
        apiKeyId,
        ...extra,
      })
      .catch((err) => {
        this.logger.error(`[${this.cls.getId()}][audit] Failed to log ${action}`, err)
      })
  }

  async list(session: AuthenticatedSession) {
    const orgId = this.requireOrgId(session)

    const rows = await this.db
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
      .where(eq(apiKeys.tenantId, orgId))
      .orderBy(apiKeys.createdAt)

    return { data: rows }
  }

  async revoke(id: string, session: AuthenticatedSession) {
    const orgId = this.requireOrgId(session)
    const userId = session.user.id

    // Fetch the key and validate it belongs to this org
    const [existing] = await this.db
      .select({
        id: apiKeys.id,
        revokedAt: apiKeys.revokedAt,
      })
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, orgId)))
      .limit(1)

    if (!existing) {
      throw new ApiKeyNotFoundException(id)
    }

    // Idempotent: if already revoked, return existing data without duplicate audit log
    if (existing.revokedAt) {
      return { id: existing.id, revokedAt: existing.revokedAt.toISOString() }
    }

    const now = new Date()

    await this.db.update(apiKeys).set({ revokedAt: now }).where(eq(apiKeys.id, id))

    this.logAudit(userId, orgId, 'api_key.revoked', id)

    return { id, revokedAt: now.toISOString() }
  }

  async validateBearerToken(token: string): Promise<{
    id: string
    userId: string
    tenantId: string
    scopes: string[]
    role: string
  }> {
    const TOKEN_REGEX = /^sk_live_[a-zA-Z0-9]{32}$/
    if (!TOKEN_REGEX.test(token)) {
      throw new ApiKeyInvalidException()
    }

    const lastFour = token.slice(-4)

    // TODO: lastFour should have a database index for performance:
    // CREATE INDEX idx_api_keys_last_four ON api_keys(last_four)
    const candidates = await this.db
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
      .where(and(eq(apiKeys.lastFour, lastFour), isNull(users.deletedAt)))
      .limit(10)

    if (candidates.length === 10) {
      this.logger.warn(
        `[validateBearerToken] lastFour bucket hit limit(10) — possible collision storm`,
        { lastFour }
      )
    }

    if (candidates.length === 0) {
      // Constant-time dummy to prevent timing oracle on lastFour enumeration
      const dummy = Buffer.from(hmacHash(token, randomBytes(16).toString('hex')), 'hex')
      timingSafeEqual(dummy, dummy)
      throw new ApiKeyInvalidException()
    }

    const match = (candidates ?? []).find((c) => {
      const computed = Buffer.from(hmacHash(token, c.keySalt), 'hex')
      const stored = Buffer.from(c.keyHash, 'hex')
      return computed.length === stored.length && timingSafeEqual(computed, stored)
    })

    if (!match || match.revokedAt || (match.expiresAt && match.expiresAt < new Date())) {
      throw new ApiKeyInvalidException()
    }

    return {
      id: match.id,
      userId: match.userId,
      tenantId: match.tenantId,
      scopes: match.scopes,
      role: match.role ?? 'user',
    }
  }

  touchLastUsedAt(id: string): void {
    this.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .catch((err) => {
        this.logger.error(`[touchLastUsedAt] Failed to update lastUsedAt for key ${id}`, err)
      })
  }

  async revokeAllForUser(userId: string) {
    const now = new Date()

    await this.db
      .update(apiKeys)
      .set({ revokedAt: now })
      .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))

    this.logger.log(`Revoked all API keys for user ${userId}`)
  }

  async revokeAllForOrg(organizationId: string) {
    const now = new Date()

    await this.db
      .update(apiKeys)
      .set({ revokedAt: now })
      .where(and(eq(apiKeys.tenantId, organizationId), isNull(apiKeys.revokedAt)))

    this.logger.log(`Revoked all API keys for organization ${organizationId}`)
  }
}
