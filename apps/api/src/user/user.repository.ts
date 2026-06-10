import type { DrizzleTx } from '../database/drizzle.provider.js'

export const USER_REPO = Symbol('USER_REPO')

export type UserProfile = {
  id: string
  fullName: string | null
  firstName: string | null
  lastName: string | null
  fullNameCustomized: boolean
  email: string
  emailVerified: boolean
  image: string | null
  avatarSeed: string | null
  avatarStyle: string | null
  avatarOptions: Record<string, unknown> | null
  role: string | null
  deletedAt: Date | null
  deleteScheduledFor: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface UserRepository {
  getSoftDeleteStatus(
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ deletedAt: Date | null; deleteScheduledFor: Date | null } | null>

  getProfile(userId: string, tx?: DrizzleTx): Promise<UserProfile | null>

  getNameFields(
    userId: string,
    tx?: DrizzleTx
  ): Promise<{
    firstName: string | null
    lastName: string | null
    fullNameCustomized: boolean
  } | null>

  updateProfile(
    userId: string,
    data: Record<string, unknown>,
    tx?: DrizzleTx
  ): Promise<UserProfile | undefined>

  findForValidation(
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ id: string; email: string; deletedAt: Date | null } | null>

  softDeleteUser(
    userId: string,
    now: Date,
    deleteScheduledFor: Date,
    tx?: DrizzleTx
  ): Promise<UserProfile | undefined>

  getBanStatus(
    userId: string,
    tx?: DrizzleTx
  ): Promise<{ banned: boolean | null; banExpires: Date | null } | null>

  reactivateUser(userId: string, tx?: DrizzleTx): Promise<UserProfile | undefined>

  transaction<T>(fn: (tx: DrizzleTx) => Promise<T>): Promise<T>
}
