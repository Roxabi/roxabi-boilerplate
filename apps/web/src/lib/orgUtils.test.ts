import { describe, expect, it } from 'vitest'

import { mockParaglideMessages } from '@/test/__mocks__/mockMessages'

mockParaglideMessages()

import { roleBadgeVariant, roleLabel } from './orgUtils'

describe('roleLabel', () => {
  it('returns translated label for owner', () => {
    expect(roleLabel('owner')).toBe('org_role_owner')
  })

  it('returns translated label for admin', () => {
    expect(roleLabel('admin')).toBe('org_role_admin')
  })

  it('returns translated label for viewer', () => {
    expect(roleLabel('viewer')).toBe('org_role_viewer')
  })

  it('returns member label for unknown role', () => {
    expect(roleLabel('member')).toBe('org_role_member')
  })

  it('returns member label for empty string', () => {
    expect(roleLabel('')).toBe('org_role_member')
  })

  it('returns member label for any other string', () => {
    expect(roleLabel('superadmin')).toBe('org_role_member')
  })
})

describe('roleBadgeVariant', () => {
  it('returns "default" for owner', () => {
    expect(roleBadgeVariant('owner')).toBe('default')
  })

  it('returns "secondary" for admin', () => {
    expect(roleBadgeVariant('admin')).toBe('secondary')
  })

  it('returns "outline" for viewer', () => {
    expect(roleBadgeVariant('viewer')).toBe('outline')
  })

  it('returns "outline" for member', () => {
    expect(roleBadgeVariant('member')).toBe('outline')
  })

  it('returns "outline" for unknown role', () => {
    expect(roleBadgeVariant('unknown')).toBe('outline')
  })
})
