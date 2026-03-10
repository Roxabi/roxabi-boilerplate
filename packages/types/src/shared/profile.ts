import type { AvatarStyle } from './avatar'

export type UserProfile = {
  id: string
  firstName: string
  lastName: string
  /**
   * Mapped from the DB column `name` (Better Auth convention).
   * The API exposes it as `fullName` for clarity; the `User` type from Better Auth uses `name` directly.
   */
  fullName: string
  fullNameCustomized: boolean
  email: string
  emailVerified: boolean
  image: string | null
  avatarSeed: string | null
  avatarStyle: AvatarStyle | null
  avatarOptions: Record<string, unknown>
  role: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  deleteScheduledFor: Date | null
}

export type UpdateProfilePayload = {
  firstName?: string
  lastName?: string
  fullName?: string
  avatarSeed?: string
  avatarStyle?: AvatarStyle
  avatarOptions?: Record<string, unknown>
  image?: string
}
