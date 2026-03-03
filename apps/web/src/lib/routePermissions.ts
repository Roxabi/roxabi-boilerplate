/**
 * Centralized route permission module.
 *
 * Provides:
 * - Declaration merging to add `permission` to TanStack Router's `staticData`
 * - `enforceRoutePermission` — a generic `beforeLoad` guard that reads
 *   `staticData.permission` and enforces it via `fetchEnrichedSession()`
 * - `useCanAccess(to)` — a client-side hook that checks whether the current
 *   user can access a given route path based on its `staticData.permission`
 */
import type { PermissionString } from '@repo/types'
import { useQuery } from '@tanstack/react-query'
import { redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import type { StaticDataRouteOption } from '@tanstack/router-core'

// ---------------------------------------------------------------------------
// Declaration merging — extend TanStack Router's StaticDataRouteOption
// ---------------------------------------------------------------------------

declare module '@tanstack/router-core' {
  interface StaticDataRouteOption {
    /**
     * Permission required to access this route.
     *
     * - `'role:superadmin'` — requires the user's role to match the suffix
     * - `'members:write'`   — requires the permission string in the session
     *
     * When omitted the route is unrestricted.
     */
    permission?: PermissionString | `role:${string}`
  }
}

// ---------------------------------------------------------------------------
// Enriched session fetcher
// ---------------------------------------------------------------------------

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
export type EnrichedSession = {
  user: { id: string; name?: string; email: string; role?: string }
  session: Record<string, JsonValue>
  permissions: string[]
}

function isEnrichedSession(data: unknown): data is EnrichedSession {
  if (data == null || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  if (obj.user == null || typeof obj.user !== 'object') return false
  if (!Array.isArray(obj.permissions)) return false
  return true
}

/**
 * Server function to fetch the enriched session by forwarding cookies
 * from the incoming request to the NestJS backend.
 * Works both during SSR (inline) and client-side navigations (via RPC).
 */
export const getServerEnrichedSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<EnrichedSession | null> => {
    const { getRequestHeader } = await import('@tanstack/react-start/server')
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000'
    try {
      const cookie = getRequestHeader('cookie')
      if (!cookie) return null
      const res = await fetch(`${apiUrl}/api/session`, {
        headers: { cookie },
      })
      if (!res.ok) return null
      const data: unknown = await res.json()
      if (!isEnrichedSession(data)) return null
      return data
    } catch {
      return null
    }
  }
)

/**
 * Fetch the enriched session (with RBAC permissions) from the NestJS backend.
 * Client-side only — used by React Query hooks.
 * Returns `null` when the user is not authenticated.
 */
async function fetchEnrichedSession(): Promise<EnrichedSession | null> {
  try {
    const res = await fetch('/api/session', { credentials: 'include' })
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (!isEnrichedSession(data)) return null
    return data
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// enforceRoutePermission — beforeLoad guard
// ---------------------------------------------------------------------------

/**
 * Generic `beforeLoad` guard that reads `staticData.permission` from the
 * current route match and enforces it against the session from root context.
 *
 * Behaviour:
 * - No `permission` defined on the route -> allow (return early).
 * - `permission` starts with `'role:'` -> check `session.user.role` matches
 *   the suffix (e.g. `'role:superadmin'`).
 * - Otherwise -> check `session.permissions.includes(permission)` OR
 *   superadmin bypass.
 *
 * Redirects:
 * - No session -> `/login`
 * - Insufficient permissions on a superadmin route -> `/admin`
 * - Insufficient permissions on an org route -> `/dashboard`
 *
 * Usage in a route file:
 * ```ts
 * export const Route = createFileRoute('/admin/users')({
 *   staticData: { permission: 'role:superadmin' },
 *   beforeLoad: enforceRoutePermission,
 * })
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: TanStack Router's beforeLoad context type is deeply generic and not easily constrained without circular inference.
export async function enforceRoutePermission(ctx: any): Promise<void> {
  // Resolve the permission string from the current route's staticData.
  const matches = ctx.matches as
    | ReadonlyArray<{ routeId: string; staticData?: StaticDataRouteOption }>
    | undefined
  const routeId = ctx.routeId as string | undefined
  const currentMatch = matches?.find((m) => m.routeId === routeId)
  const permission = currentMatch?.staticData?.permission
  if (!permission) return

  // Read session from root route context (fetched once in __root.tsx beforeLoad)
  const session = ctx.context?.session as EnrichedSession | null

  // No session at all -> redirect to login
  if (!session) {
    throw redirect({ to: '/login' })
  }

  const isRoleCheck = permission.startsWith('role:')

  if (isRoleCheck) {
    const requiredRole = permission.slice('role:'.length)
    if (session.user.role === requiredRole) return
    // Insufficient role -> redirect to /admin (they're already authenticated
    // but lack the required system role)
    throw redirect({ to: '/admin' })
  }

  // Permission-string check with superadmin bypass
  if (session.user.role === 'superadmin') return
  if (session.permissions.includes(permission)) return

  // Insufficient org-level permission -> redirect to dashboard
  throw redirect({ to: '/dashboard' })
}

// ---------------------------------------------------------------------------
// useEnrichedSession — cached enriched session via React Query
// ---------------------------------------------------------------------------

export const enrichedSessionKeys = { all: ['enriched-session'] as const }

/**
 * Fetch and cache the enriched session (with RBAC permissions).
 *
 * Better Auth's `useSession()` returns the standard session without the
 * `permissions` array. This hook uses React Query to fetch and cache the
 * enriched session from the NestJS `/api/session` endpoint so that
 * `useCanAccess` can check permission strings like `'members:write'`.
 */
export function useEnrichedSession() {
  return useQuery({
    queryKey: enrichedSessionKeys.all,
    queryFn: fetchEnrichedSession,
    staleTime: 30_000,
    retry: false,
  })
}

// ---------------------------------------------------------------------------
// useCanAccess — client-side hook
// ---------------------------------------------------------------------------

/**
 * Check whether the current user can access a given route path.
 *
 * Looks up the route by its path pattern via `router.routesByPath`, reads the
 * `staticData?.permission` value, and checks it against the enriched session
 * (which includes the RBAC `permissions` array).
 *
 * Returns `true` when:
 * - The route has no `permission` defined (unrestricted).
 * - The session satisfies the permission requirement.
 *
 * Returns `false` when:
 * - No session is available (or still loading).
 * - The session does not satisfy the permission requirement.
 * - The route path is not found in the router.
 *
 * Usage:
 * ```tsx
 * const canAccessUsers = useCanAccess('/admin/users')
 * if (canAccessUsers) { ... }
 * ```
 */
export function useCanAccess(to: string): boolean {
  const router = useRouter()
  const { data: session } = useEnrichedSession()

  // Look up the route by its path pattern
  const routesByPath = router.routesByPath as unknown as Record<
    string,
    { options?: { staticData?: StaticDataRouteOption } } | undefined
  >
  const route = routesByPath[to]
  if (!route) return false

  const permission = route.options?.staticData?.permission
  // No permission required -> unrestricted
  if (!permission) return true

  // No session -> cannot access
  if (!session) return false

  const isRoleCheck = permission.startsWith('role:')

  if (isRoleCheck) {
    const requiredRole = permission.slice('role:'.length)
    return session.user.role === requiredRole
  }

  // Superadmin bypass
  if (session.user.role === 'superadmin') return true

  // Check RBAC permissions array from enriched session
  if (session.permissions.includes(permission)) return true

  return false
}
