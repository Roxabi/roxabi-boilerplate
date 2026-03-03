import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { and, count, eq } from 'drizzle-orm'
import { DELETION_GRACE_PERIOD_MS } from '../common/constants.js'
import {
  ORGANIZATION_SOFT_DELETED,
  OrganizationSoftDeletedEvent,
} from '../common/events/organizationSoftDeleted.event.js'
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider.js'
import { whereActive } from '../database/helpers/whereActive.js'
import { invitations, members, organizations, sessions } from '../database/schema/auth.schema.js'
import { roles } from '../database/schema/rbac.schema.js'
import { OrgNameConfirmationMismatchException } from './exceptions/orgNameConfirmationMismatch.exception.js'
import { OrgNotDeletedException } from './exceptions/orgNotDeleted.exception.js'
import { OrgNotFoundException } from './exceptions/orgNotFound.exception.js'
import { OrgNotOwnerException } from './exceptions/orgNotOwner.exception.js'

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async listForUser(userId: string) {
    return this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        createdAt: organizations.createdAt,
      })
      .from(members)
      .innerJoin(organizations, eq(members.organizationId, organizations.id))
      .where(and(eq(members.userId, userId), whereActive(organizations)))
      .orderBy(organizations.name)
  }

  async softDelete(orgId: string, userId: string, confirmName: string) {
    const org = await this.findActiveOrgOrThrow(orgId)
    if (org.name.toLowerCase() !== confirmName.toLowerCase()) {
      throw new OrgNameConfirmationMismatchException()
    }
    await this.requireOwnership(orgId, userId)

    const now = new Date()
    const deleteScheduledFor = new Date(now.getTime() + DELETION_GRACE_PERIOD_MS)

    const updated = await this.db.transaction(async (tx) => {
      const [result] = await tx
        .update(organizations)
        .set({ deletedAt: now, deleteScheduledFor, updatedAt: now })
        .where(eq(organizations.id, orgId))
        .returning({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          deletedAt: organizations.deletedAt,
          deleteScheduledFor: organizations.deleteScheduledFor,
        })

      await tx
        .update(sessions)
        .set({ activeOrganizationId: null })
        .where(eq(sessions.activeOrganizationId, orgId))

      await tx
        .update(invitations)
        .set({ status: 'expired' })
        .where(and(eq(invitations.organizationId, orgId), eq(invitations.status, 'pending')))

      return result
    })

    await this.eventEmitter.emitAsync(
      ORGANIZATION_SOFT_DELETED,
      new OrganizationSoftDeletedEvent(orgId)
    )

    return updated
  }

  async reactivate(orgId: string, userId: string) {
    const [org] = await this.db
      .select({ id: organizations.id, deletedAt: organizations.deletedAt })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)
    if (!org) throw new OrgNotFoundException(orgId)
    if (!org.deletedAt) throw new OrgNotDeletedException(orgId)

    await this.requireOwnership(orgId, userId)

    const [updated] = await this.db
      .update(organizations)
      .set({ deletedAt: null, deleteScheduledFor: null, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))
      .returning({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        deletedAt: organizations.deletedAt,
        deleteScheduledFor: organizations.deleteScheduledFor,
      })

    return updated
  }

  private async findActiveOrgOrThrow(orgId: string) {
    const [org] = await this.db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(and(eq(organizations.id, orgId), whereActive(organizations)))
      .limit(1)
    if (!org) throw new OrgNotFoundException(orgId)
    return org
  }

  private async requireOwnership(orgId: string, userId: string) {
    const [membership] = await this.db
      .select({ role: members.role })
      .from(members)
      .where(and(eq(members.organizationId, orgId), eq(members.userId, userId)))
      .limit(1)
    if (!membership || membership.role !== 'owner') {
      throw new OrgNotOwnerException(orgId)
    }
  }

  async getDeletionImpact(orgId: string) {
    await this.findActiveOrgOrThrow(orgId)

    // Count members
    const [memberResult] = await this.db
      .select({ count: count() })
      .from(members)
      .where(eq(members.organizationId, orgId))

    // Count pending invitations
    const [invitationResult] = await this.db
      .select({ count: count() })
      .from(invitations)
      .where(and(eq(invitations.organizationId, orgId), eq(invitations.status, 'pending')))

    // Count custom roles (non-default, tenant-scoped)
    const [roleResult] = await this.db
      .select({ count: count() })
      .from(roles)
      .where(and(eq(roles.tenantId, orgId), eq(roles.isDefault, false)))

    return {
      memberCount: memberResult?.count ?? 0,
      invitationCount: invitationResult?.count ?? 0,
      customRoleCount: roleResult?.count ?? 0,
    }
  }
}
