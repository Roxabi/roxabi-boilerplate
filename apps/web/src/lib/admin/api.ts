import type { OrgDeletionImpact } from '@repo/types'
import { apiDelete, apiGet, apiPatch, apiPost } from '../apiClient'

/**
 * Centralized admin API layer.
 * Transport delegated to apiClient (credentials, Content-Type, ApiError).
 */

const BASE = '/api/admin'

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export async function fetchAdminOrganizations(params?: string) {
  return apiGet<unknown>(`${BASE}/organizations${params ? `?${params}` : ''}`)
}

export async function fetchAdminOrganizationTree() {
  return apiGet<unknown>(`${BASE}/organizations?view=tree`)
}

export async function fetchAdminOrganization(orgId: string) {
  return apiGet<unknown>(`${BASE}/organizations/${orgId}`)
}

export async function deleteAdminOrganization(orgId: string): Promise<void> {
  return apiDelete(`${BASE}/organizations/${orgId}`)
}

export async function restoreAdminOrganization(orgId: string) {
  return apiPost<unknown>(`${BASE}/organizations/${orgId}/restore`, {})
}

export async function fetchAdminOrgDeletionImpact(orgId: string) {
  return apiGet<OrgDeletionImpact>(`${BASE}/organizations/${orgId}/deletion-impact`)
}

export async function fetchAdminOrgRoles(orgId: string) {
  return apiGet<unknown>(`${BASE}/organizations/${orgId}/roles`)
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function fetchAdminUsers(params?: string) {
  return apiGet<unknown>(`${BASE}/users${params ? `?${params}` : ''}`)
}

export async function fetchAdminUser(userId: string) {
  return apiGet<unknown>(`${BASE}/users/${userId}`)
}

export async function deleteAdminUser(userId: string): Promise<void> {
  return apiDelete(`${BASE}/users/${userId}`)
}

export async function restoreAdminUser(userId: string) {
  return apiPost<unknown>(`${BASE}/users/${userId}/restore`, {})
}

export async function banAdminUser(userId: string, reason: string, expires?: string) {
  return apiPost<unknown>(`${BASE}/users/${userId}/ban`, { reason, expires })
}

export async function unbanAdminUser(userId: string) {
  return apiPost<unknown>(`${BASE}/users/${userId}/unban`, {})
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function fetchAdminMembers(params?: string) {
  return apiGet<unknown>(`${BASE}/members${params ? `?${params}` : ''}`)
}

export async function inviteAdminMember(orgId: string, email: string, role: string) {
  return apiPost<unknown>(`${BASE}/members/invite`, { organizationId: orgId, email, role })
}

export async function updateAdminMemberRole(orgId: string, memberId: string, role: string) {
  return apiPatch<unknown>(`${BASE}/organizations/${orgId}/members/${memberId}/role`, { role })
}

export async function cancelAdminInvitation(invitationId: string): Promise<void> {
  return apiDelete(`${BASE}/invitations/${invitationId}`)
}

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------

export async function fetchAdminAuditLogs(params?: string) {
  return apiGet<unknown>(`${BASE}/audit-logs${params ? `?${params}` : ''}`)
}

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

export async function fetchAdminFeatureFlags() {
  return apiGet<unknown>(`${BASE}/feature-flags`)
}

export async function createAdminFeatureFlag(data: {
  name: string
  key: string
  description?: string
}) {
  return apiPost<unknown>(`${BASE}/feature-flags`, data)
}

export async function updateAdminFeatureFlag(
  id: string,
  data: { name?: string; description?: string; enabled?: boolean }
) {
  return apiPatch<unknown>(`${BASE}/feature-flags/${id}`, data)
}

export async function deleteAdminFeatureFlag(id: string): Promise<void> {
  return apiDelete(`${BASE}/feature-flags/${id}`)
}

// ---------------------------------------------------------------------------
// System settings
// ---------------------------------------------------------------------------

export async function fetchAdminSystemSettings() {
  return apiGet<unknown>(`${BASE}/settings`)
}

export async function updateAdminSystemSettings(data: unknown) {
  return apiPatch<unknown>(`${BASE}/settings`, data)
}
