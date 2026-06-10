import { describe, expect, it } from 'vitest'
import { adminAuditKeys, adminOrgKeys, adminSettingsKeys, adminUserKeys } from './queryKeys'

describe('adminOrgKeys', () => {
  it('all should be base array', () => {
    expect(adminOrgKeys.all).toEqual(['admin', 'organizations'])
  })

  it('list should append list + filters', () => {
    const filters = { search: 'acme', page: 1 }
    expect(adminOrgKeys.list(filters)).toEqual(['admin', 'organizations', 'list', filters])
  })

  it('list with string filters', () => {
    expect(adminOrgKeys.list('page=2')).toEqual(['admin', 'organizations', 'list', 'page=2'])
  })

  it('tree should append tree segment', () => {
    expect(adminOrgKeys.tree()).toEqual(['admin', 'organizations', 'tree'])
  })

  it('allForParent should append all-for-parent segment', () => {
    expect(adminOrgKeys.allForParent()).toEqual(['admin', 'organizations', 'all-for-parent'])
  })

  it('filterOptions should append filter-options segment', () => {
    expect(adminOrgKeys.filterOptions()).toEqual(['admin', 'organizations', 'filter-options'])
  })

  it('detail should append orgId', () => {
    expect(adminOrgKeys.detail('org-1')).toEqual(['admin', 'organizations', 'org-1'])
  })

  it('roles should append orgId + roles', () => {
    expect(adminOrgKeys.roles('org-2')).toEqual(['admin', 'organizations', 'org-2', 'roles'])
  })

  it('deletionImpact should append orgId + deletion-impact', () => {
    expect(adminOrgKeys.deletionImpact('org-3')).toEqual([
      'admin',
      'organizations',
      'org-3',
      'deletion-impact',
    ])
  })

  it('detail keys with different orgIds should differ', () => {
    const key1 = adminOrgKeys.detail('org-a')
    const key2 = adminOrgKeys.detail('org-b')
    expect(key1).not.toEqual(key2)
  })
})

describe('adminUserKeys', () => {
  it('all should be base array', () => {
    expect(adminUserKeys.all).toEqual(['admin', 'users'])
  })

  it('list should append list + filters', () => {
    const filters = { banned: true }
    expect(adminUserKeys.list(filters)).toEqual(['admin', 'users', 'list', filters])
  })

  it('list with undefined filters', () => {
    expect(adminUserKeys.list(undefined)).toEqual(['admin', 'users', 'list', undefined])
  })

  it('detail should append detail + userId', () => {
    expect(adminUserKeys.detail('user-42')).toEqual(['admin', 'users', 'detail', 'user-42'])
  })

  it('detail keys with different userIds should differ', () => {
    expect(adminUserKeys.detail('user-1')).not.toEqual(adminUserKeys.detail('user-2'))
  })
})

describe('adminAuditKeys', () => {
  it('all should be base array', () => {
    expect(adminAuditKeys.all).toEqual(['admin', 'audit-logs'])
  })

  it('list should append filters directly (no list segment)', () => {
    const filters = { action: 'login' }
    expect(adminAuditKeys.list(filters)).toEqual(['admin', 'audit-logs', filters])
  })

  it('list with null filters', () => {
    expect(adminAuditKeys.list(null)).toEqual(['admin', 'audit-logs', null])
  })
})

describe('adminSettingsKeys', () => {
  it('all should be base array', () => {
    expect(adminSettingsKeys.all).toEqual(['admin', 'system-settings'])
  })
})
