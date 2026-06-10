import { magicLinkClient, organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { clientEnv } from '@/lib/env.shared'

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : clientEnv.VITE_APP_URL,
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
