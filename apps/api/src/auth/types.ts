import type { Role } from '@repo/types'

/**
 * Full authenticated session shape returned by the auth guard.
 * Used in auth controller, auth guard, and anywhere the full session is needed.
 */
export type AuthenticatedSession = {
  user: { id: string; role?: Role }
  session: { id: string; activeOrganizationId?: string | null }
  permissions: string[]
  actorType: 'user' | 'api_key'
  apiKeyId?: string
}

/**
 * Narrowed session for admin endpoints that require an active organization.
 * The guard ensures activeOrganizationId is present when @Permissions() is used.
 */
export type AdminSession = {
  user: { id: string }
  session: { activeOrganizationId: string }
}
