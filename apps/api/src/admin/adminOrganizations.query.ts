import { Inject, Injectable } from '@nestjs/common'
import { and, count, desc, eq, ilike, isNotNull, isNull, or, type SQL } from 'drizzle-orm'
import { buildCursorCondition, buildCursorResponse } from '../common/utils/cursorPagination.util.js'
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider.js'
import { members, organizations } from '../database/schema/auth.schema.js'
import { escapeIlikePattern } from './utils/escapeIlikePattern.js'

/**
 * AdminOrganizationsQueryService — read-only query operations for admin org management.
 *
 * Handles: listOrganizations, listOrganizationsForTree.
 *
 * Uses raw DRIZZLE connection (not TenantService) for cross-tenant access.
 *
 * WARNING: The raw DRIZZLE connection bypasses all RLS policies.
 */
@Injectable()
export class AdminOrganizationsQueryService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * List organizations with cursor-based pagination and optional filters.
   * Includes memberCount via correlated subquery.
   */
  async listOrganizations(
    filters: { status?: string; search?: string },
    cursor?: string,
    limit = 20
  ) {
    const conditions = this.buildOrgFilterConditions(filters, cursor)
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined
    const rows = await this.queryOrgRows(whereClause, limit)

    return buildCursorResponse(
      rows,
      limit,
      (row) => row.createdAt,
      (row) => row.id
    )
  }

  /**
   * List all non-deleted organizations for tree view.
   * Returns treeViewAvailable=false if > 1000 orgs.
   */
  async listOrganizationsForTree() {
    // Count query
    const [countResult] = await this.db
      .select({ count: count() })
      .from(organizations)
      .where(isNull(organizations.deletedAt))

    if ((countResult?.count ?? 0) > 1000) {
      return {
        treeViewAvailable: false,
        data: [] as {
          id: string
          name: string
          slug: string | null
          parentOrganizationId: string | null
          memberCount: number
        }[],
      }
    }

    // Fetch all non-deleted orgs with member counts
    const rows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        parentOrganizationId: organizations.parentOrganizationId,
        memberCount: count(members.id),
      })
      .from(organizations)
      .leftJoin(members, eq(organizations.id, members.organizationId))
      .where(isNull(organizations.deletedAt))
      .groupBy(organizations.id)

    return { treeViewAvailable: true, data: rows }
  }

  private buildOrgFilterConditions(
    filters: { status?: string; search?: string },
    cursor?: string
  ): SQL[] {
    const conditions: SQL[] = []

    if (filters.status === 'active') {
      conditions.push(isNull(organizations.deletedAt))
    } else if (filters.status === 'archived') {
      conditions.push(isNotNull(organizations.deletedAt))
    }

    if (filters.search) {
      const pattern = `%${escapeIlikePattern(filters.search)}%`
      const searchCondition = or(
        ilike(organizations.name, pattern),
        ilike(organizations.slug, pattern)
      )
      if (searchCondition) conditions.push(searchCondition)
    }

    if (cursor) {
      conditions.push(buildCursorCondition(cursor, organizations.createdAt, organizations.id))
    }

    return conditions
  }

  private queryOrgRows(whereClause: SQL | undefined, limit: number) {
    return this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        metadata: organizations.metadata,
        parentOrganizationId: organizations.parentOrganizationId,
        deletedAt: organizations.deletedAt,
        deleteScheduledFor: organizations.deleteScheduledFor,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        memberCount: count(members.id),
      })
      .from(organizations)
      .leftJoin(members, eq(organizations.id, members.organizationId))
      .where(whereClause)
      .groupBy(organizations.id)
      .orderBy(desc(organizations.createdAt), desc(organizations.id))
      .limit(limit + 1)
  }
}
