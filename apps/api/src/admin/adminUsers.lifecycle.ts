import { Inject, Injectable, Logger } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { ClsService } from 'nestjs-cls'
import { AuditService } from '../audit/audit.service.js'
import { DELETION_GRACE_PERIOD_MS } from '../common/constants.js'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../database/drizzle.provider.js'
import { users } from '../database/schema/auth.schema.js'
import { findUserSnapshotOrThrow, isLastActiveSuperadmin } from './adminUsers.shared.js'
import { LastSuperadminException } from './exceptions/lastSuperadmin.exception.js'
import { NotDeletedException } from './exceptions/notDeleted.exception.js'
import { SelfActionException } from './exceptions/selfAction.exception.js'
import { SuperadminProtectionException } from './exceptions/superadminProtection.exception.js'
import { UserAlreadyBannedException } from './exceptions/userAlreadyBanned.exception.js'
import { logUserAudit } from './utils/logAudit.js'

/**
 * AdminUsersLifecycleService -- lifecycle state-transition operations for admin user management.
 *
 * Handles: banUser, unbanUser, deleteUser, restoreUser.
 *
 * Uses raw DRIZZLE connection (not TenantService) for cross-tenant access.
 *
 * WARNING: The raw DRIZZLE connection bypasses all RLS policies.
 */
@Injectable()
export class AdminUsersLifecycleService {
  private readonly logger = new Logger(AdminUsersLifecycleService.name)

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly auditService: AuditService,
    private readonly cls: ClsService
  ) {}

  /**
   * Ban a user.
   */
  async banUser(userId: string, reason: string, expires: Date | null, actorId: string) {
    if (actorId === userId) {
      throw new SelfActionException()
    }

    const [user, updatedUser] = await this.db.transaction(
      async (tx) => {
        const snapshot = await findUserSnapshotOrThrow(tx, userId)
        await this.validateBanEligibility(tx, snapshot, userId)

        const [updated] = await tx
          .update(users)
          .set({ banned: true, banReason: reason, banExpires: expires })
          .where(eq(users.id, userId))
          .returning()

        return [snapshot, updated] as const
      },
      { isolationLevel: 'serializable' }
    )

    logUserAudit(
      this.auditService,
      this.logger,
      this.cls,
      'user.banned',
      userId,
      actorId,
      user,
      updatedUser
    )

    return updatedUser
  }

  private async validateBanEligibility(
    tx: DrizzleTx,
    user: { role: string | null; banned: boolean | null },
    userId: string
  ) {
    if (user.role === 'superadmin') {
      const isLast = await isLastActiveSuperadmin(tx, userId)
      if (isLast) {
        throw new LastSuperadminException()
      }
      throw new SuperadminProtectionException()
    }
    if (user.banned) {
      throw new UserAlreadyBannedException(userId)
    }
  }

  /**
   * Unban a user -- set banned=false, clear banReason and banExpires.
   */
  async unbanUser(userId: string, actorId: string) {
    const user = await findUserSnapshotOrThrow(this.db, userId)

    const [updatedUser] = await this.db
      .update(users)
      .set({ banned: false, banReason: null, banExpires: null })
      .where(eq(users.id, userId))
      .returning()

    logUserAudit(
      this.auditService,
      this.logger,
      this.cls,
      'user.unbanned',
      userId,
      actorId,
      user,
      updatedUser
    )

    return updatedUser
  }

  /**
   * Soft-delete a user -- set deletedAt and deleteScheduledFor (now + 30 days).
   */
  async deleteUser(userId: string, actorId: string) {
    if (actorId === userId) {
      throw new SelfActionException()
    }

    const user = await findUserSnapshotOrThrow(this.db, userId)
    this.validateDeleteEligibility(user, userId)

    const now = new Date()
    const scheduledFor = new Date(now.getTime() + DELETION_GRACE_PERIOD_MS)

    const [updatedUser] = await this.db
      .update(users)
      .set({ deletedAt: now, deleteScheduledFor: scheduledFor })
      .where(eq(users.id, userId))
      .returning()

    logUserAudit(
      this.auditService,
      this.logger,
      this.cls,
      'user.deleted',
      userId,
      actorId,
      user,
      updatedUser
    )

    return updatedUser
  }

  private validateDeleteEligibility(
    user: { role: string | null; deletedAt: Date | null },
    userId: string
  ) {
    if (user.role === 'superadmin') {
      throw new SuperadminProtectionException()
    }
    if (user.deletedAt) {
      throw new NotDeletedException('User', userId)
    }
  }

  /**
   * Restore a soft-deleted user -- clear deletedAt and deleteScheduledFor.
   */
  async restoreUser(userId: string, actorId: string) {
    const user = await findUserSnapshotOrThrow(this.db, userId)

    if (!user.deletedAt) {
      throw new NotDeletedException('User', userId)
    }

    const [updatedUser] = await this.db
      .update(users)
      .set({ deletedAt: null, deleteScheduledFor: null })
      .where(eq(users.id, userId))
      .returning()

    logUserAudit(
      this.auditService,
      this.logger,
      this.cls,
      'user.restored',
      userId,
      actorId,
      user,
      updatedUser
    )

    return updatedUser
  }
}
