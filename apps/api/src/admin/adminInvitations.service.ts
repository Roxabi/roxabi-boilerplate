import { Inject, Injectable, Logger } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { ClsService } from 'nestjs-cls'
import { AuditService } from '../audit/audit.service.js'
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider.js'
import { PG_UNIQUE_VIOLATION } from '../database/pgErrorCodes.js'
import { invitations, members, users } from '../database/schema/auth.schema.js'
import { roles } from '../database/schema/rbac.schema.js'
import { InvitationAlreadyPendingException } from './exceptions/invitationAlreadyPending.exception.js'
import { InvitationNotFoundException } from './exceptions/invitationNotFound.exception.js'
import { MemberAlreadyExistsException } from './exceptions/memberAlreadyExists.exception.js'
import { AdminRoleNotFoundException } from './exceptions/roleNotFound.exception.js'

/**
 * AdminInvitationsService -- invitation-related operations for admin member management.
 *
 * Handles: inviteMember, listPendingInvitations, revokeInvitation.
 *
 * Uses raw DRIZZLE connection (not TenantService) for cross-tenant access.
 *
 * WARNING: The raw DRIZZLE connection bypasses all RLS policies. Any new queries added
 * to this service MUST include explicit WHERE clauses filtering by organizationId.
 * Changes to this file should be flagged in code review.
 */
@Injectable()
export class AdminInvitationsService {
  private readonly logger = new Logger(AdminInvitationsService.name)

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly auditService: AuditService,
    private readonly cls: ClsService
  ) {}

  /**
   * Invite a new member to the organization.
   * Checks for existing membership and pending invitations.
   */
  async inviteMember(orgId: string, data: { email: string; roleId: string }, actorId: string) {
    const role = await this.findRoleOrThrow(orgId, data.roleId)
    await this.ensureNoExistingMembership(orgId, data.email)
    await this.ensureNoPendingInvitation(orgId, data.email)

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    const invitation = await this.insertOrReuseInvitation(
      orgId,
      data.email,
      role.slug,
      actorId,
      expiresAt
    )

    this.logInvitationAudit('member.invited', 'invitation', orgId, invitation?.id ?? '', actorId, {
      after: {
        email: data.email,
        roleId: data.roleId,
        roleSlug: role.slug,
      },
    })

    return invitation
  }

  private async findRoleOrThrow(orgId: string, roleId: string) {
    const [role] = await this.db
      .select({ id: roles.id, slug: roles.slug })
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.tenantId, orgId)))
      .limit(1)

    if (!role) {
      throw new AdminRoleNotFoundException(roleId)
    }
    return role
  }

  /**
   * Best-effort check for existing membership.
   * NOTE (TOCTOU): Not atomic -- constraint violation handled in insert path.
   */
  private async ensureNoExistingMembership(orgId: string, email: string) {
    const [existingMember] = await this.db
      .select({ id: members.id })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(and(eq(members.organizationId, orgId), eq(users.email, email)))
      .limit(1)

    if (existingMember) {
      throw new MemberAlreadyExistsException()
    }
  }

  private async ensureNoPendingInvitation(orgId: string, email: string) {
    const [existingInvitation] = await this.db
      .select({ id: invitations.id })
      .from(invitations)
      .where(
        and(
          eq(invitations.organizationId, orgId),
          eq(invitations.email, email),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1)

    if (existingInvitation) {
      throw new InvitationAlreadyPendingException()
    }
  }

  private async insertOrReuseInvitation(
    orgId: string,
    email: string,
    roleSlug: string,
    actorId: string,
    expiresAt: Date
  ) {
    try {
      const [invitation] = await this.db
        .insert(invitations)
        .values({
          organizationId: orgId,
          email,
          role: roleSlug,
          status: 'pending',
          inviterId: actorId,
          expiresAt,
        })
        .returning()
      return invitation
    } catch (err) {
      return this.handleInviteConstraintViolation(err, orgId, email, roleSlug, actorId, expiresAt)
    }
  }

  /**
   * Handle unique constraint violation during invitation insert.
   * Uses postgres error code 23505 (unique_violation) instead of fragile string matching.
   *
   * NOTE (W7): The unique constraint is on (org, email) regardless of status.
   * If a non-pending invitation (accepted/rejected/expired) exists, update it
   * to pending instead of throwing.
   */
  private async handleInviteConstraintViolation(
    err: unknown,
    orgId: string,
    email: string,
    roleSlug: string,
    actorId: string,
    expiresAt: Date
  ): Promise<typeof invitations.$inferSelect | undefined> {
    const pgErr = err as { code?: string; constraint_name?: string }
    if (
      pgErr.code !== PG_UNIQUE_VIOLATION ||
      pgErr.constraint_name !== 'invitations_org_email_unique'
    ) {
      throw err
    }

    const [existing] = await this.db
      .select({ id: invitations.id, status: invitations.status })
      .from(invitations)
      .where(and(eq(invitations.organizationId, orgId), eq(invitations.email, email)))
      .limit(1)

    if (existing && existing.status === 'pending') {
      throw new InvitationAlreadyPendingException()
    }

    // Re-invite: update existing non-pending invitation back to pending
    if (existing) {
      const [updated] = await this.db
        .update(invitations)
        .set({
          role: roleSlug,
          status: 'pending',
          inviterId: actorId,
          expiresAt,
        })
        .where(eq(invitations.id, existing.id))
        .returning()
      return updated
    }

    // Fallback: constraint violation but no matching row found -- re-throw
    throw err
  }

  /**
   * List pending invitations for an organization.
   */
  async listPendingInvitations(orgId: string) {
    const rows = await this.db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
      })
      .from(invitations)
      .where(and(eq(invitations.organizationId, orgId), eq(invitations.status, 'pending')))
      .orderBy(invitations.expiresAt)

    return { data: rows }
  }

  /**
   * Revoke (delete) a pending invitation.
   * Verifies the invitation belongs to the given organization before deleting.
   */
  async revokeInvitation(invitationId: string, orgId: string, actorId: string) {
    const [invitation] = await this.db
      .select({
        id: invitations.id,
        email: invitations.email,
        organizationId: invitations.organizationId,
      })
      .from(invitations)
      .where(and(eq(invitations.id, invitationId), eq(invitations.organizationId, orgId)))
      .limit(1)

    if (!invitation) {
      throw new InvitationNotFoundException(invitationId)
    }

    await this.db.delete(invitations).where(eq(invitations.id, invitationId))

    this.logInvitationAudit('invitation.revoked', 'invitation', orgId, invitationId, actorId, {
      before: { email: invitation.email },
    })

    return { revoked: true }
  }

  private logInvitationAudit(
    action: string,
    resource: string,
    orgId: string,
    resourceId: string,
    actorId: string,
    data?: { before?: Record<string, unknown>; after?: Record<string, unknown> }
  ) {
    const payload: Record<string, unknown> = {
      actorId,
      actorType: 'user',
      organizationId: orgId,
      action,
      resource,
      resourceId,
    }
    if (data?.before !== undefined) payload.before = data.before
    if (data?.after !== undefined) payload.after = data.after

    this.auditService.log(payload as Parameters<AuditService['log']>[0]).catch((err) => {
      this.logger.error(`[${this.cls.getId()}][audit] Failed to log ${action}`, err)
    })
  }
}
