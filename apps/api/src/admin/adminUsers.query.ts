import { Inject, Injectable } from '@nestjs/common'
import {
  and,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNotNull,
  isNull,
  max,
  or,
  type SQL,
} from 'drizzle-orm'
import { buildCursorCondition, buildCursorResponse } from '../common/utils/cursorPagination.util.js'
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider.js'
import { auditLogs } from '../database/schema/audit.schema.js'
import { members, organizations, users } from '../database/schema/auth.schema.js'
import { escapeIlikePattern } from './utils/escapeIlikePattern.js'

/**
 * AdminUsersQueryService — read-only query operations for admin user management.
 *
 * Handles: listUsers (cursor-paginated user listing with filter support).
 *
 * Extracted from AdminUsersService to maintain SRP as the admin module grows.
 *
 * Uses raw DRIZZLE connection (not TenantService) for cross-tenant access.
 *
 * WARNING: The raw DRIZZLE connection bypasses all RLS policies.
 */
@Injectable()
export class AdminUsersQueryService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * List users with cursor-based pagination and optional filters.
   *
   * Uses a two-query approach to avoid duplicate rows from LEFT JOIN:
   * 1. Query users table only (with filters, cursor, limit).
   * 2. Batch-fetch memberships for the returned user IDs.
   */
  async listUsers(
    filters: { role?: string; status?: string; organizationId?: string; search?: string },
    cursor?: string,
    limit = 20
  ) {
    const conditions = this.buildUserFilterConditions(filters, cursor)
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Query 1: Users only (no joins) — correct pagination without duplicates
    const userRows = await this.queryUserRows(whereClause, limit)

    // Build cursor response before fetching memberships (uses limit+1 logic)
    const paginatedResult = buildCursorResponse(
      userRows,
      limit,
      (row) => row.createdAt,
      (row) => row.id
    )

    // Query 2: Batch-fetch memberships for the page of users
    const userIds = paginatedResult.data.map((u) => u.id)
    const [membershipsByUserId, lastActiveByUserId] = await Promise.all([
      this.fetchMembershipsByUserIds(userIds),
      this.fetchLastActiveByUserIds(userIds),
    ])

    // Merge organizations, organizationCount, and lastActive onto each user
    const data = paginatedResult.data.map((user) => {
      const orgs = membershipsByUserId.get(user.id) ?? []
      return {
        ...user,
        organizations: orgs,
        organizationCount: orgs.length,
        lastActive: lastActiveByUserId.get(user.id) ?? null,
      }
    })

    return { data, cursor: paginatedResult.cursor }
  }

  private buildUserFilterConditions(
    filters: { role?: string; status?: string; organizationId?: string; search?: string },
    cursor?: string
  ): SQL[] {
    const conditions: SQL[] = []

    if (filters.role) {
      conditions.push(eq(users.role, filters.role))
    }

    if (filters.status === 'active') {
      conditions.push(eq(users.banned, false))
      conditions.push(isNull(users.deletedAt))
    } else if (filters.status === 'banned') {
      conditions.push(eq(users.banned, true))
    } else if (filters.status === 'archived') {
      conditions.push(isNotNull(users.deletedAt))
    }

    if (filters.organizationId) {
      conditions.push(
        exists(
          this.db
            .select({ one: members.id })
            .from(members)
            .where(
              and(eq(members.userId, users.id), eq(members.organizationId, filters.organizationId))
            )
        )
      )
    }

    if (filters.search) {
      const pattern = `%${escapeIlikePattern(filters.search)}%`
      const searchCondition = or(ilike(users.name, pattern), ilike(users.email, pattern))
      if (searchCondition) conditions.push(searchCondition)
    }

    if (cursor) {
      conditions.push(buildCursorCondition(cursor, users.createdAt, users.id))
    }

    return conditions
  }

  private queryUserRows(whereClause: SQL | undefined, limit: number) {
    return this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        banned: users.banned,
        banReason: users.banReason,
        banExpires: users.banExpires,
        deletedAt: users.deletedAt,
        deleteScheduledFor: users.deleteScheduledFor,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(limit + 1)
  }

  private async fetchMembershipsByUserIds(
    userIds: string[]
  ): Promise<Map<string, { id: string; name: string; slug: string | null; role: string }[]>> {
    if (userIds.length === 0) return new Map()

    const membershipRows = await this.db
      .select({
        userId: members.userId,
        orgId: organizations.id,
        orgName: organizations.name,
        orgSlug: organizations.slug,
        role: members.role,
      })
      .from(members)
      .innerJoin(organizations, eq(members.organizationId, organizations.id))
      .where(inArray(members.userId, userIds))

    const map = new Map<string, { id: string; name: string; slug: string | null; role: string }[]>()
    for (const row of membershipRows) {
      const list = map.get(row.userId) ?? []
      list.push({ id: row.orgId, name: row.orgName, slug: row.orgSlug, role: row.role })
      map.set(row.userId, list)
    }
    return map
  }

  /**
   * Batch-fetch the most recent audit log timestamp per user (#312).
   * Returns a Map of userId → ISO timestamp string.
   *
   * Query: SELECT actorId, MAX(timestamp) FROM audit_logs WHERE actorId IN (:ids) GROUP BY actorId
   */
  private async fetchLastActiveByUserIds(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map()

    const rows = await this.db
      .select({
        actorId: auditLogs.actorId,
        lastActive: max(auditLogs.timestamp),
      })
      .from(auditLogs)
      .where(inArray(auditLogs.actorId, userIds))
      .groupBy(auditLogs.actorId)

    const map = new Map<string, string>()
    for (const row of rows) {
      if (row.lastActive) {
        map.set(row.actorId, row.lastActive.toISOString())
      }
    }
    return map
  }
}
