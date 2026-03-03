import { Inject, Injectable, Logger } from '@nestjs/common'
import { and, count, desc, eq, ilike, isNotNull, isNull, or, type SQL } from 'drizzle-orm'
import { ClsService } from 'nestjs-cls'
import { AuditService } from '../audit/audit.service.js'
import { buildCursorCondition, buildCursorResponse } from '../common/utils/cursorPagination.util.js'
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider.js'
import { PG_UNIQUE_VIOLATION } from '../database/pgErrorCodes.js'
import { members, organizations, users } from '../database/schema/auth.schema.js'
import { roles } from '../database/schema/rbac.schema.js'
import { getDepth, validateHierarchy } from './adminOrganizations.hierarchy.js'
import { findOrgSnapshotOrThrow } from './adminOrganizations.shared.js'
import { OrgDepthExceededException } from './exceptions/orgDepthExceeded.exception.js'
import { AdminOrgNotFoundException } from './exceptions/orgNotFound.exception.js'
import { OrgSlugConflictException } from './exceptions/orgSlugConflict.exception.js'
import { escapeIlikePattern } from './utils/escapeIlikePattern.js'
import { logOrgAudit } from './utils/logAudit.js'

/**
 * AdminOrganizationsService — cross-tenant org management for super admins.
 *
 * Uses raw DRIZZLE connection (not TenantService) for cross-tenant access.
 *
 * WARNING: The raw DRIZZLE connection bypasses all RLS policies.
 */
@Injectable()
export class AdminOrganizationsService {
  private readonly logger = new Logger(AdminOrganizationsService.name)

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly auditService: AuditService,
    private readonly cls: ClsService
  ) {}

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

  /**
   * Get detailed org info with members and child organizations.
   */
  async getOrganizationDetail(orgId: string) {
    const organization = await this.findOrgOrThrow(orgId)

    const [parentOrganization, orgMembers, childOrgs] = await Promise.all([
      this.fetchParentOrg(organization.parentOrganizationId),
      this.fetchOrgMembers(orgId),
      this.fetchChildOrgs(orgId),
    ])

    return {
      ...organization,
      memberCount: orgMembers.length,
      childCount: childOrgs.length,
      parentOrganization,
      members: orgMembers,
      children: childOrgs,
    }
  }

  private async findOrgOrThrow(orgId: string) {
    const [organization] = await this.db
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
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)

    if (!organization) {
      throw new AdminOrgNotFoundException(orgId)
    }
    return organization
  }

  private async fetchParentOrg(
    parentId: string | null
  ): Promise<{ id: string; name: string; slug: string | null } | null> {
    if (!parentId) return null
    const [parent] = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
      })
      .from(organizations)
      .where(eq(organizations.id, parentId))
      .limit(1)
    return parent ?? null
  }

  /**
   * List available RBAC roles for an organization (#313).
   * Returns { data: { id, name, slug }[] }.
   */
  async listOrgRoles(orgId: string) {
    await this.findOrgOrThrow(orgId)

    const roleRows = await this.db
      .select({
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
      })
      .from(roles)
      .where(eq(roles.tenantId, orgId))

    return { data: roleRows }
  }

  private fetchOrgMembers(orgId: string) {
    return this.db
      .select({
        id: members.id,
        userId: members.userId,
        name: users.name,
        email: users.email,
        role: members.role,
        roleId: members.roleId,
        createdAt: members.createdAt,
      })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.organizationId, orgId))
  }

  private fetchChildOrgs(orgId: string) {
    return this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        parentOrganizationId: organizations.parentOrganizationId,
        memberCount: count(members.id),
      })
      .from(organizations)
      .leftJoin(members, eq(organizations.id, members.organizationId))
      .where(eq(organizations.parentOrganizationId, orgId))
      .groupBy(organizations.id)
  }

  /**
   * Create a new organization. Validates parent depth.
   */
  async createOrganization(
    data: { name: string; slug: string; parentOrganizationId?: string | null },
    actorId: string
  ) {
    // Validate parent depth if parentOrganizationId is provided
    if (data.parentOrganizationId) {
      const depth = await getDepth(this.db, data.parentOrganizationId)
      if (depth + 1 >= 3) {
        throw new OrgDepthExceededException()
      }
    }

    // Insert the organization
    let createdOrg: typeof organizations.$inferSelect
    try {
      const [result] = await this.db
        .insert(organizations)
        .values({
          name: data.name,
          slug: data.slug,
          parentOrganizationId: data.parentOrganizationId ?? null,
        })
        .returning()
      if (!result) throw new AdminOrgNotFoundException('insert returned no rows')
      createdOrg = result
    } catch (err) {
      const pgErr = err as { code?: string }
      if (pgErr.code === PG_UNIQUE_VIOLATION) {
        throw new OrgSlugConflictException()
      }
      throw err
    }

    // Fire-and-forget audit log
    this.auditService
      .log({
        actorId,
        actorType: 'user',
        action: 'org.created',
        resource: 'organization',
        resourceId: createdOrg.id,
        organizationId: createdOrg.id,
        after: { ...createdOrg },
      })
      .catch((err) => {
        this.logger.error(`[${this.cls.getId()}][audit] Failed to log org.created`, err)
      })

    return createdOrg
  }

  /**
   * Update an organization. Validates hierarchy on reparent.
   */
  async updateOrganization(
    orgId: string,
    data: { name?: string; slug?: string; parentOrganizationId?: string | null },
    actorId: string
  ) {
    const beforeOrg = await findOrgSnapshotOrThrow(this.db, orgId)

    if (data.parentOrganizationId !== undefined && data.parentOrganizationId !== null) {
      await validateHierarchy(this.db, orgId, data.parentOrganizationId)
    }

    const updatedOrg = await this.executeOrgUpdate(orgId, data)

    const auditAction =
      data.parentOrganizationId !== undefined &&
      data.parentOrganizationId !== beforeOrg.parentOrganizationId
        ? 'org.parent_changed'
        : 'org.updated'

    logOrgAudit(
      this.auditService,
      this.logger,
      this.cls,
      auditAction,
      orgId,
      actorId,
      beforeOrg,
      updatedOrg
    )

    return updatedOrg
  }

  private async executeOrgUpdate(
    orgId: string,
    data: { name?: string; slug?: string; parentOrganizationId?: string | null }
  ) {
    try {
      const [result] = await this.db
        .update(organizations)
        .set(data)
        .where(eq(organizations.id, orgId))
        .returning()
      if (!result) throw new AdminOrgNotFoundException(orgId)
      return result
    } catch (err) {
      const pgErr = err as { code?: string }
      if (pgErr.code === PG_UNIQUE_VIOLATION) {
        throw new OrgSlugConflictException()
      }
      throw err
    }
  }
}
