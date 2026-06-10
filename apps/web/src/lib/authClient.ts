import { magicLinkClient, organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  // SSR must NOT use an absolute baseURL: a network self-fetch deadlocks the
  // server during startup readiness checks (and is wasteful in general).
  // Relative URLs are handled in-process by nitro during SSR.
  baseURL: typeof window !== 'undefined' ? window.location.origin : undefined,
  // Better Auth admin client plugin removed in Phase 1 (#268)
  // All admin actions go through NestJS AdminModule with guards + audit logging
  plugins: [organizationClient(), magicLinkClient()],
})

export const { useSession, signIn, signUp, signOut } = authClient

export type EnabledProviders = { google: boolean; github: boolean }

export async function fetchEnabledProviders(): Promise<EnabledProviders> {
  try {
    const res = await fetch('/api/auth/providers')
    if (!res.ok) return { google: false, github: false }
    return (await res.json()) as EnabledProviders
  } catch {
    return { google: false, github: false }
  }
}
