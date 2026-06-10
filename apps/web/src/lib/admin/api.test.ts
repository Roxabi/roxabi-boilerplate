import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  banAdminUser,
  cancelAdminInvitation,
  createAdminFeatureFlag,
  deleteAdminFeatureFlag,
  deleteAdminOrganization,
  deleteAdminUser,
  fetchAdminAuditLogs,
  fetchAdminFeatureFlags,
  fetchAdminMembers,
  fetchAdminOrganization,
  fetchAdminOrganizations,
  fetchAdminOrganizationTree,
  fetchAdminOrgDeletionImpact,
  fetchAdminOrgRoles,
  fetchAdminSystemSettings,
  fetchAdminUser,
  fetchAdminUsers,
  inviteAdminMember,
  restoreAdminOrganization,
  restoreAdminUser,
  unbanAdminUser,
  updateAdminFeatureFlag,
  updateAdminMemberRole,
  updateAdminSystemSettings,
} from './api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function okResponse(body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function errorResponse(status: number, body?: Record<string, unknown>): Response {
  const bodyText = body ? JSON.stringify(body) : 'error'
  return new Response(bodyText, {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let fetchSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse())
})

afterEach(() => {
  fetchSpy.mockRestore()
})

function lastCall(): [string, RequestInit] {
  return fetchSpy.mock.calls[0] as [string, RequestInit]
}

function lastUrl(): string {
  return lastCall()[0]
}

function lastOptions(): RequestInit {
  return lastCall()[1]
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

describe('fetchAdminOrganizations', () => {
  it('should GET /api/admin/organizations without params', async () => {
    await fetchAdminOrganizations()
    expect(lastUrl()).toContain('/api/admin/organizations')
    expect(lastOptions().credentials).toBe('include')
  })

  it('should append query string when params provided', async () => {
    await fetchAdminOrganizations('page=2&search=acme')
    expect(lastUrl()).toContain('/api/admin/organizations')
    expect(lastUrl()).toContain('page=2')
    expect(lastUrl()).toContain('search=acme')
  })

  it('should return parsed JSON on success', async () => {
    fetchSpy.mockResolvedValue(okResponse({ data: [{ id: 'o-1' }] }))
    const result = await fetchAdminOrganizations()
    expect(result).toEqual({ data: [{ id: 'o-1' }] })
  })

  it('should throw with server message on non-ok response', async () => {
    fetchSpy.mockResolvedValue(errorResponse(403, { message: 'Forbidden' }))
    await expect(fetchAdminOrganizations()).rejects.toThrow('Forbidden')
  })

  it('should throw with HTTP status fallback when no message field', async () => {
    fetchSpy.mockResolvedValue(errorResponse(500, { error: 'oops' }))
    await expect(fetchAdminOrganizations()).rejects.toThrow('HTTP 500')
  })
})

describe('fetchAdminOrganizationTree', () => {
  it('should GET /api/admin/organizations?view=tree', async () => {
    await fetchAdminOrganizationTree()
    expect(lastUrl()).toContain('/api/admin/organizations')
    expect(lastUrl()).toContain('view=tree')
  })
})

describe('fetchAdminOrganization', () => {
  it('should GET /api/admin/organizations/:orgId', async () => {
    await fetchAdminOrganization('org-42')
    expect(lastUrl()).toContain('/api/admin/organizations/org-42')
  })
})

describe('deleteAdminOrganization', () => {
  it('should DELETE /api/admin/organizations/:orgId', async () => {
    await deleteAdminOrganization('org-7')
    expect(lastUrl()).toBe('/api/admin/organizations/org-7')
    expect(lastOptions().method).toBe('DELETE')
  })
})

describe('restoreAdminOrganization', () => {
  it('should POST /api/admin/organizations/:orgId/restore', async () => {
    await restoreAdminOrganization('org-7')
    expect(lastUrl()).toBe('/api/admin/organizations/org-7/restore')
    expect(lastOptions().method).toBe('POST')
  })
})

describe('fetchAdminOrgDeletionImpact', () => {
  it('should GET /api/admin/organizations/:orgId/deletion-impact', async () => {
    fetchSpy.mockResolvedValue(
      okResponse({ membersCount: 3, subOrgsCount: 1, invitationsCount: 0 })
    )
    const result = await fetchAdminOrgDeletionImpact('org-1')
    expect(lastUrl()).toContain('/api/admin/organizations/org-1/deletion-impact')
    expect(result).toEqual({ membersCount: 3, subOrgsCount: 1, invitationsCount: 0 })
  })
})

describe('fetchAdminOrgRoles', () => {
  it('should GET /api/admin/organizations/:orgId/roles', async () => {
    await fetchAdminOrgRoles('org-5')
    expect(lastUrl()).toContain('/api/admin/organizations/org-5/roles')
  })
})

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

describe('fetchAdminUsers', () => {
  it('should GET /api/admin/users without params', async () => {
    await fetchAdminUsers()
    expect(lastUrl()).toContain('/api/admin/users')
  })

  it('should append query string when params provided', async () => {
    await fetchAdminUsers('banned=true')
    expect(lastUrl()).toContain('/api/admin/users')
    expect(lastUrl()).toContain('banned=true')
  })

  it('should throw on non-ok response', async () => {
    fetchSpy.mockResolvedValue(errorResponse(401, { message: 'Unauthorized' }))
    await expect(fetchAdminUsers()).rejects.toThrow('Unauthorized')
  })
})

describe('fetchAdminUser', () => {
  it('should GET /api/admin/users/:userId', async () => {
    await fetchAdminUser('user-99')
    expect(lastUrl()).toContain('/api/admin/users/user-99')
  })
})

describe('deleteAdminUser', () => {
  it('should DELETE /api/admin/users/:userId', async () => {
    await deleteAdminUser('user-1')
    expect(lastUrl()).toBe('/api/admin/users/user-1')
    expect(lastOptions().method).toBe('DELETE')
  })
})

describe('restoreAdminUser', () => {
  it('should POST /api/admin/users/:userId/restore', async () => {
    await restoreAdminUser('user-3')
    expect(lastUrl()).toBe('/api/admin/users/user-3/restore')
    expect(lastOptions().method).toBe('POST')
  })
})

describe('banAdminUser', () => {
  it('should POST /api/admin/users/:userId/ban with reason and expires', async () => {
    await banAdminUser('user-5', 'Spam', '2027-01-01')
    expect(lastUrl()).toBe('/api/admin/users/user-5/ban')
    expect(lastOptions().method).toBe('POST')
    expect(JSON.parse(lastOptions().body as string)).toEqual({
      reason: 'Spam',
      expires: '2027-01-01',
    })
  })

  it('should POST with undefined expires when not provided', async () => {
    await banAdminUser('user-5', 'Spam')
    const body = JSON.parse(lastOptions().body as string)
    expect(body.reason).toBe('Spam')
    expect(body.expires).toBeUndefined()
  })

  it('should include Content-Type header', async () => {
    await banAdminUser('user-5', 'Spam')
    const headers = lastOptions().headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
  })
})

describe('unbanAdminUser', () => {
  it('should POST /api/admin/users/:userId/unban', async () => {
    await unbanAdminUser('user-5')
    expect(lastUrl()).toBe('/api/admin/users/user-5/unban')
    expect(lastOptions().method).toBe('POST')
  })
})

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

describe('fetchAdminMembers', () => {
  it('should GET /api/admin/members without params', async () => {
    await fetchAdminMembers()
    expect(lastUrl()).toContain('/api/admin/members')
  })

  it('should append query string when params provided', async () => {
    await fetchAdminMembers('orgId=o-1')
    expect(lastUrl()).toContain('/api/admin/members')
    expect(lastUrl()).toContain('orgId=o-1')
  })
})

describe('inviteAdminMember', () => {
  it('should POST /api/admin/members/invite with org, email and role', async () => {
    await inviteAdminMember('org-1', 'bob@example.com', 'admin')
    expect(lastUrl()).toBe('/api/admin/members/invite')
    expect(lastOptions().method).toBe('POST')
    expect(JSON.parse(lastOptions().body as string)).toEqual({
      organizationId: 'org-1',
      email: 'bob@example.com',
      role: 'admin',
    })
  })
})

describe('updateAdminMemberRole', () => {
  it('should PATCH /api/admin/organizations/:orgId/members/:memberId/role', async () => {
    await updateAdminMemberRole('org-1', 'mem-2', 'owner')
    expect(lastUrl()).toBe('/api/admin/organizations/org-1/members/mem-2/role')
    expect(lastOptions().method).toBe('PATCH')
    expect(JSON.parse(lastOptions().body as string)).toEqual({ role: 'owner' })
  })
})

describe('cancelAdminInvitation', () => {
  it('should DELETE /api/admin/invitations/:invitationId', async () => {
    await cancelAdminInvitation('inv-99')
    expect(lastUrl()).toBe('/api/admin/invitations/inv-99')
    expect(lastOptions().method).toBe('DELETE')
  })
})

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------

describe('fetchAdminAuditLogs', () => {
  it('should GET /api/admin/audit-logs without params', async () => {
    await fetchAdminAuditLogs()
    expect(lastUrl()).toContain('/api/admin/audit-logs')
  })

  it('should append query string when params provided', async () => {
    await fetchAdminAuditLogs('action=login')
    expect(lastUrl()).toContain('/api/admin/audit-logs')
    expect(lastUrl()).toContain('action=login')
  })
})

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

describe('fetchAdminFeatureFlags', () => {
  it('should GET /api/admin/feature-flags', async () => {
    await fetchAdminFeatureFlags()
    expect(lastUrl()).toContain('/api/admin/feature-flags')
  })
})

describe('createAdminFeatureFlag', () => {
  it('should POST /api/admin/feature-flags with name, key, description', async () => {
    await createAdminFeatureFlag({ name: 'Beta Feature', key: 'beta_feature', description: 'desc' })
    expect(lastUrl()).toBe('/api/admin/feature-flags')
    expect(lastOptions().method).toBe('POST')
    expect(JSON.parse(lastOptions().body as string)).toEqual({
      name: 'Beta Feature',
      key: 'beta_feature',
      description: 'desc',
    })
  })

  it('should POST without description when not provided', async () => {
    await createAdminFeatureFlag({ name: 'Flag', key: 'flag' })
    const body = JSON.parse(lastOptions().body as string)
    expect(body.name).toBe('Flag')
    expect(body.key).toBe('flag')
    expect(body.description).toBeUndefined()
  })

  it('should throw on error response', async () => {
    fetchSpy.mockResolvedValue(errorResponse(422, { message: 'Key already exists' }))
    await expect(createAdminFeatureFlag({ name: 'F', key: 'dup' })).rejects.toThrow(
      'Key already exists'
    )
  })
})

describe('updateAdminFeatureFlag', () => {
  it('should PATCH /api/admin/feature-flags/:id with partial data', async () => {
    await updateAdminFeatureFlag('flag-1', { enabled: true })
    expect(lastUrl()).toBe('/api/admin/feature-flags/flag-1')
    expect(lastOptions().method).toBe('PATCH')
    expect(JSON.parse(lastOptions().body as string)).toEqual({ enabled: true })
  })

  it('should send all fields when provided', async () => {
    await updateAdminFeatureFlag('flag-2', {
      name: 'New name',
      description: 'New desc',
      enabled: false,
    })
    const body = JSON.parse(lastOptions().body as string)
    expect(body).toEqual({ name: 'New name', description: 'New desc', enabled: false })
  })
})

describe('deleteAdminFeatureFlag', () => {
  it('should DELETE /api/admin/feature-flags/:id', async () => {
    await deleteAdminFeatureFlag('flag-3')
    expect(lastUrl()).toBe('/api/admin/feature-flags/flag-3')
    expect(lastOptions().method).toBe('DELETE')
  })
})

// ---------------------------------------------------------------------------
// System settings
// ---------------------------------------------------------------------------

describe('fetchAdminSystemSettings', () => {
  it('should GET /api/admin/settings', async () => {
    await fetchAdminSystemSettings()
    expect(lastUrl()).toContain('/api/admin/settings')
  })

  it('should return parsed settings object', async () => {
    fetchSpy.mockResolvedValue(okResponse({ maintenanceMode: false, signupsEnabled: true }))
    const result = await fetchAdminSystemSettings()
    expect(result).toEqual({ maintenanceMode: false, signupsEnabled: true })
  })
})

describe('updateAdminSystemSettings', () => {
  it('should PATCH /api/admin/settings with data', async () => {
    await updateAdminSystemSettings({ maintenanceMode: true })
    expect(lastUrl()).toBe('/api/admin/settings')
    expect(lastOptions().method).toBe('PATCH')
    expect(JSON.parse(lastOptions().body as string)).toEqual({ maintenanceMode: true })
  })

  it('should include Content-Type header', async () => {
    await updateAdminSystemSettings({ foo: 'bar' })
    const headers = lastOptions().headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
  })
})

// ---------------------------------------------------------------------------
// Error handling — apiClient transport
// ---------------------------------------------------------------------------

describe('apiClient error handling', () => {
  it('should throw error with message from response body', async () => {
    fetchSpy.mockResolvedValue(errorResponse(404, { message: 'Not found' }))
    await expect(fetchAdminOrganization('nope')).rejects.toThrow('Not found')
  })

  it('should fall back to HTTP status when body has no message', async () => {
    fetchSpy.mockResolvedValue(
      new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } })
    )
    await expect(fetchAdminOrganization('nope')).rejects.toThrow('HTTP 503')
  })

  it('should throw when body is not JSON', async () => {
    fetchSpy.mockResolvedValue(new Response('Not a json', { status: 500 }))
    await expect(fetchAdminOrganization('nope')).rejects.toThrow()
  })

  it('should include credentials on every request', async () => {
    await fetchAdminSystemSettings()
    expect(lastOptions().credentials).toBe('include')
  })
})
