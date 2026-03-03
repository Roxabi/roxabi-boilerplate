import { Inject, Injectable, Logger } from '@nestjs/common'
import { and, count, eq, inArray, isNull } from 'drizzle-orm'
import { ClsService } from 'nestjs-cls'
import { AuditService } from '../audit/audit.service.js'
import { DELETION_GRACE_PERIOD_MS } from '../common/constants.js'
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider.js'
import { members, organizations, users } from '../database/schema/auth.schema.js'
import { getDescendantOrgIds } from './adminOrganizations.hierarchy.js'
import { findOrgSnapshotOrThrow } from './adminOrganizations.shared.js'
import { NotDeletedException } from './exceptions/notDeleted.exception.js'
import { AdminOrgNotFoundException } from './exceptions/orgNotFound.exception.js'
import { logOrgAudit } from './utils/logAudit.js'

/**
 * AdminOrganizationsDeletionService -- deletion-related operations for admin org management.
 *
 * Handles: getDeletionImpact, deleteOrganization, restoreOrganization.
 *
 * Uses raw DRIZZLE connection (not TenantService) for cross-tenant access.
 *
 * WARNING: The raw DRIZZLE connection bypasses all RLS policies.
 */
@Injectable()
export class AdminOrganizationsDeletionService {
  private readonly logger = new Logger(AdminOrganizationsDeletionService.name)

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly auditService: AuditService,
    private readonly cls: ClsService
  ) {}

  /**
   * Preview the impact of deleting an organization.
   */
  async getDeletionImpact(orgId: string) {
    // Org lookup
    const [org] = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)

    if (!org) {
      throw new AdminOrgNotFoundException(orgId)
    }

    // Member count
    const [memberCountResult] = await this.db
      .select({ count: count() })
      .from(members)
      .where(eq(members.organizationId, orgId))

    // Active members: not deleted and not banned
    const [activeMembersResult] = await this.db
      .select({ count: count() })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(
        and(eq(members.organizationId, orgId), isNull(users.deletedAt), eq(users.banned, false))
      )

    // Child org count (direct children only)
    const [childOrgCountResult] = await this.db
      .select({ count: count() })
      .from(organizations)
      .where(eq(organizations.parentOrganizationId, orgId))

    // Collect all descendant org IDs recursively for child member count
    const descendantIds = await getDescendantOrgIds(this.db, orgId)

    // Child member count (members in ALL descendant orgs)
    let childMemberCount = 0
    if (descendantIds.length > 0) {
      const [childMemberCountResult] = await this.db
        .select({ count: count() })
        .from(members)
        .where(inArray(members.organizationId, descendantIds))
      childMemberCount = childMemberCountResult?.count ?? 0
    }

    return {
      memberCount: memberCountResult?.count,
      activeMembers: activeMembersResult?.count,
      childOrgCount: childOrgCountResult?.count,
      childMemberCount,
    }
  }

  /**
   * Soft-delete an organization -- set deletedAt and deleteScheduledFor.
   */
  async deleteOrganization(orgId: string, actorId: string) {
    const org = await findOrgSnapshotOrThrow(this.db, orgId)

    if (org.deletedAt) {
      throw new NotDeletedException('Organization', orgId)
    }

    const now = new Date()
    const scheduledFor = new Date(now.getTime() + DELETION_GRACE_PERIOD_MS)

    const [updatedOrg] = await this.db
      .update(organizations)
      .set({ deletedAt: now, deleteScheduledFor: scheduledFor })
      .where(eq(organizations.id, orgId))
      .returning()

    logOrgAudit(
      this.auditService,
      this.logger,
      this.cls,
      'org.deleted',
      orgId,
      actorId,
      org,
      updatedOrg
    )

    return updatedOrg
  }

  /**
   * Restore a soft-deleted organization -- clear deletedAt and deleteScheduledFor.
   */
  async restoreOrganization(orgId: string, actorId: string) {
    const org = await findOrgSnapshotOrThrow(this.db, orgId)

    if (!org.deletedAt) {
      throw new NotDeletedException('Organization', orgId)
    }

    const [updatedOrg] = await this.db
      .update(organizations)
      .set({ deletedAt: null, deleteScheduledFor: null })
      .where(eq(organizations.id, orgId))
      .returning()

    logOrgAudit(
      this.auditService,
      this.logger,
      this.cls,
      'org.restored',
      orgId,
      actorId,
      org,
      updatedOrg
    )

    return updatedOrg
  }
}
