import type { OrgDeletionImpact } from '@repo/types'

/**
 * Centralized admin API layer.
 * All functions include credentials for cookie-based auth.
 */

export type ApiError = { status: number; message: string }

async function checkResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null)
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : `HTTP ${res.status}`
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

async function fetchAdmin<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  return checkResponse<T>(res)
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export async function fetchAdminOrganizations(params?: string) {
  return fetchAdmin<unknown>(`/organizations${params ? `?${params}` : ''}`)
}

export async function fetchAdminOrganizationTree() {
  return fetchAdmin<unknown>('/organizations?view=tree')
}

export async function fetchAdminOrganization(orgId: string) {
  return fetchAdmin<unknown>(`/organizations/${orgId}`)
}

export async function deleteAdminOrganization(orgId: string) {
  return fetchAdmin<unknown>(`/organizations/${orgId}`, { method: 'DELETE' })
}

export async function restoreAdminOrganization(orgId: string) {
  return fetchAdmin<unknown>(`/organizations/${orgId}/restore`, { method: 'POST' })
}

export async function fetchAdminOrgDeletionImpact(orgId: string) {
  return fetchAdmin<OrgDeletionImpact>(`/organizations/${orgId}/deletion-impact`)
}

export async function fetchAdminOrgRoles(orgId: string) {
  return fetchAdmin<unknown>(`/organizations/${orgId}/roles`)
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function fetchAdminUsers(params?: string) {
  return fetchAdmin<unknown>(`/users${params ? `?${params}` : ''}`)
}

export async function fetchAdminUser(userId: string) {
  return fetchAdmin<unknown>(`/users/${userId}`)
}

export async function deleteAdminUser(userId: string) {
  return fetchAdmin<unknown>(`/users/${userId}`, { method: 'DELETE' })
}

export async function restoreAdminUser(userId: string) {
  return fetchAdmin<unknown>(`/users/${userId}/restore`, { method: 'POST' })
}

export async function banAdminUser(userId: string, reason: string, expires?: string) {
  return fetchAdmin<unknown>(`/users/${userId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason, expires }),
  })
}

export async function unbanAdminUser(userId: string) {
  return fetchAdmin<unknown>(`/users/${userId}/unban`, { method: 'POST' })
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function fetchAdminMembers(params?: string) {
  return fetchAdmin<unknown>(`/members${params ? `?${params}` : ''}`)
}

export async function inviteAdminMember(orgId: string, email: string, role: string) {
  return fetchAdmin<unknown>('/members/invite', {
    method: 'POST',
    body: JSON.stringify({ organizationId: orgId, email, role }),
  })
}

export async function updateAdminMemberRole(orgId: string, memberId: string, role: string) {
  return fetchAdmin<unknown>(`/organizations/${orgId}/members/${memberId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}

export async function cancelAdminInvitation(invitationId: string) {
  return fetchAdmin<unknown>(`/invitations/${invitationId}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------

export async function fetchAdminAuditLogs(params?: string) {
  return fetchAdmin<unknown>(`/audit-logs${params ? `?${params}` : ''}`)
}

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

export async function fetchAdminFeatureFlags() {
  return fetchAdmin<unknown>('/feature-flags')
}

export async function createAdminFeatureFlag(data: {
  name: string
  key: string
  description?: string
}) {
  return fetchAdmin<unknown>('/feature-flags', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAdminFeatureFlag(
  id: string,
  data: { name?: string; description?: string; enabled?: boolean }
) {
  return fetchAdmin<unknown>(`/feature-flags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteAdminFeatureFlag(id: string) {
  return fetchAdmin<unknown>(`/feature-flags/${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// System settings
// ---------------------------------------------------------------------------

export async function fetchAdminSystemSettings() {
  return fetchAdmin<unknown>('/settings')
}

export async function updateAdminSystemSettings(data: unknown) {
  return fetchAdmin<unknown>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
