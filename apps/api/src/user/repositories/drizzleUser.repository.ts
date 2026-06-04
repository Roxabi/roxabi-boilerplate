import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import { whereActive } from '../../database/helpers/whereActive.js'
import {
  invitations,
  members,
  organizations,
  sessions,
  users,
} from '../../database/schema/auth.schema.js'
import type { UserProfile, UserRepository } from '../user.repository.js'

const profileColumns = {
  id: users.id,
  fullName: users.name,
  firstName: users.firstName,
  lastName: users.lastName,
  fullNameCustomized: users.fullNameCustomized,
  email: users.email,
  emailVerified: users.emailVerified,
  image: users.image,
  avatarSeed: users.avatarSeed,
  avatarStyle: users.avatarStyle,
  avatarOptions: users.avatarOptions,
  role: users.role,
  deletedAt: users.deletedAt,
  deleteScheduledFor: users.deleteScheduledFor,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
}

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getSoftDeleteStatus(
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ deletedAt: Date | null; deleteScheduledFor: Date | null } | null> {
    const qb = tx ?? this.db
    const [user] = await qb
      .select({ deletedAt: users.deletedAt, deleteScheduledFor: users.deleteScheduledFor })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    return user ?? null
  }

  async getBanStatus(
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ banned: boolean | null; banExpires: Date | null } | null> {
    const qb = tx ?? this.db
    const [user] = await qb
      .select({ banned: users.banned, banExpires: users.banExpires })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    return user ?? null
  }

  async getProfile(userId: string, tx?: DrizzleTx): Promise<UserProfile | null> {
    const qb = tx ?? this.db
    const [user] = await qb.select(profileColumns).from(users).where(eq(users.id, userId)).limit(1)
    return user ?? null
  }

  async getNameFields(
    userId: string,
    tx?: DrizzleTx
  ): Promise<{
    firstName: string | null
    lastName: string | null
    fullNameCustomized: boolean
  } | null> {
    const qb = tx ?? this.db
    const [current] = await qb
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        fullNameCustomized: users.fullNameCustomized,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    return current ?? null
  }

  async updateProfile(
    userId: string,
    data: Record<string, unknown>,
    tx?: DrizzleTx
  ): Promise<UserProfile | undefined> {
    const qb = tx ?? this.db
    const [updated] = await qb
      .update(users)
      .set(data)
      .where(and(eq(users.id, userId), whereActive(users)))
      .returning(profileColumns)
    return updated
  }

  async findForValidation(
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ id: string; email: string; deletedAt: Date | null } | null> {
    const qb = tx ?? this.db
    const [user] = await qb
      .select({ id: users.id, email: users.email, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    return user ?? null
  }

  async softDeleteUser(
    userId: string,
    now: Date,
    deleteScheduledFor: Date,
    tx?: DrizzleTx
  ): Promise<UserProfile | undefined> {
    const qb = tx ?? this.db
    const [result] = await qb
      .update(users)
      .set({ deletedAt: now, deleteScheduledFor, updatedAt: now })
      .where(eq(users.id, userId))
      .returning(profileColumns)
    return result
  }

  async reactivateUser(userId: string, tx?: DrizzleTx): Promise<UserProfile | undefined> {
    const qb = tx ?? this.db
    const [updated] = await qb
      .update(users)
      .set({ deletedAt: null, deleteScheduledFor: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning(profileColumns)
    return updated
  }

  async getOwnedOrganizations(
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ orgId: string; orgName: string; orgSlug: string | null }[]> {
    const qb = tx ?? this.db
    return qb
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        orgSlug: organizations.slug,
      })
      .from(members)
      .innerJoin(organizations, eq(members.organizationId, organizations.id))
      .where(and(eq(members.userId, userId), eq(members.role, 'owner'), whereActive(organizations)))
  }

  async deleteUserSessions(userId: string, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb.delete(sessions).where(eq(sessions.userId, userId))
  }

  async verifyOrgOwnership(
    orgId: string,
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ role: string } | undefined> {
    const qb = tx ?? this.db
    const [membership] = await qb
      .select({ role: members.role })
      .from(members)
      .where(and(eq(members.organizationId, orgId), eq(members.userId, userId)))
      .limit(1)
    return membership
  }

  async verifyTargetMember(
    orgId: string,
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ id: string } | undefined> {
    const qb = tx ?? this.db
    const [targetMember] = await qb
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.organizationId, orgId), eq(members.userId, userId)))
      .limit(1)
    return targetMember
  }

  async transferOrgOwnership(
    orgId: string,
    targetUserId: string,
    now: Date,
    tx?: DrizzleTx
  ): Promise<void> {
    const qb = tx ?? this.db
    await qb
      .update(members)
      .set({ role: 'owner', updatedAt: now })
      .where(and(eq(members.organizationId, orgId), eq(members.userId, targetUserId)))
  }

  async softDeleteOrg(
    orgId: string,
    now: Date,
    deleteScheduledFor: Date,
    tx?: DrizzleTx
  ): Promise<void> {
    const qb = tx ?? this.db
    await qb
      .update(organizations)
      .set({ deletedAt: now, deleteScheduledFor, updatedAt: now })
      .where(eq(organizations.id, orgId))
  }

  async clearOrgSessions(orgId: string, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb
      .update(sessions)
      .set({ activeOrganizationId: null })
      .where(eq(sessions.activeOrganizationId, orgId))
  }

  async expireOrgInvitations(orgId: string, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb
      .update(invitations)
      .set({ status: 'expired' })
      .where(and(eq(invitations.organizationId, orgId), eq(invitations.status, 'pending')))
  }

  transaction<T>(fn: (tx: DrizzleTx) => Promise<T>): Promise<T> {
    return this.db.transaction(fn)
  }
}
