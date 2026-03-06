import { afterEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_ROLES } from '../../src/rbac/rbac.constants.js'
import { parsePreset, VALID_PRESETS } from '../dbSeed.js'
import { seed as authSeed, FULL_EXTRA_USERS, MINIMAL_USERS } from './auth.fixture.js'
import { seed as consentSeed } from './consent.fixture.js'
import { runFixtures } from './index.js'
import { DEFAULT_PERMISSIONS, seed as permissionsSeed } from './permissions.fixture.js'
import { seed as rbacSeed } from './rbac.fixture.js'
import {
  FULL_EXTRA_MEMBERS,
  FULL_EXTRA_ORGS,
  FULL_INVITATIONS,
  MINIMAL_MEMBERS,
  MINIMAL_ORGS,
  seed as tenantSeed,
} from './tenant.fixture.js'

const VALID_ROLES = DEFAULT_ROLES.map((r) => r.slug)

// ---------------------------------------------------------------------------
// 1. User fixture data integrity
// ---------------------------------------------------------------------------

describe('auth fixture data', () => {
  it('should have exactly 4 minimal users', () => {
    // Arrange / Act / Assert
    expect(MINIMAL_USERS).toHaveLength(4)
  })

  it('should have exactly 9 full extra users', () => {
    // Arrange / Act / Assert
    expect(FULL_EXTRA_USERS).toHaveLength(9)
  })

  it('should have unique emails across all users', () => {
    // Arrange
    const allUsers = [...MINIMAL_USERS, ...FULL_EXTRA_USERS]
    const emails = allUsers.map((u) => u.email)

    // Act
    const uniqueEmails = new Set(emails)

    // Assert
    expect(uniqueEmails.size).toBe(emails.length)
  })

  it('should have all emails ending with .local', () => {
    // Arrange
    const allUsers = [...MINIMAL_USERS, ...FULL_EXTRA_USERS]

    // Act / Assert
    for (const user of allUsers) {
      expect(user.email).toMatch(/\.local$/)
    }
  })

  it('should export a seed function', () => {
    // Arrange / Act / Assert
    expect(authSeed).toBeTypeOf('function')
  })
})

// ---------------------------------------------------------------------------
// 2. Org fixture data integrity
// ---------------------------------------------------------------------------

describe('tenant fixture data — organizations', () => {
  it('should have exactly 2 minimal orgs', () => {
    // Arrange / Act / Assert
    expect(MINIMAL_ORGS).toHaveLength(2)
  })

  it('should have exactly 2 full extra orgs', () => {
    // Arrange / Act / Assert
    expect(FULL_EXTRA_ORGS).toHaveLength(2)
  })

  it('should have unique slugs across all orgs', () => {
    // Arrange
    const allOrgs = [...MINIMAL_ORGS, ...FULL_EXTRA_ORGS]
    const slugs = allOrgs.map((o) => o.slug)

    // Act
    const uniqueSlugs = new Set(slugs)

    // Assert
    expect(uniqueSlugs.size).toBe(slugs.length)
  })

  it('should have all org slugs in kebab-case', () => {
    // Arrange
    const allOrgs = [...MINIMAL_ORGS, ...FULL_EXTRA_ORGS]
    const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

    // Act / Assert
    for (const org of allOrgs) {
      expect(org.slug).toMatch(kebabCaseRegex)
    }
  })

  it('should export a seed function', () => {
    // Arrange / Act / Assert
    expect(tenantSeed).toBeTypeOf('function')
  })
})

// ---------------------------------------------------------------------------
// 3. Member mapping integrity
// ---------------------------------------------------------------------------

describe('tenant fixture data — members', () => {
  it('should not reference out-of-bound user indexes in minimal members', () => {
    // Arrange
    const maxUserIndex = MINIMAL_USERS.length - 1

    // Act / Assert
    for (const member of MINIMAL_MEMBERS) {
      expect(member.userIndex).toBeGreaterThanOrEqual(0)
      expect(member.userIndex).toBeLessThanOrEqual(maxUserIndex)
    }
  })

  it('should not reference out-of-bound org indexes in minimal members', () => {
    // Arrange
    const maxOrgIndex = MINIMAL_ORGS.length - 1

    // Act / Assert
    for (const member of MINIMAL_MEMBERS) {
      expect(member.orgIndex).toBeGreaterThanOrEqual(0)
      expect(member.orgIndex).toBeLessThanOrEqual(maxOrgIndex)
    }
  })

  it('should not reference out-of-bound user indexes in full extra members', () => {
    // Arrange — full preset has minimal + extra users
    const totalUsers = MINIMAL_USERS.length + FULL_EXTRA_USERS.length
    const maxUserIndex = totalUsers - 1

    // Act / Assert
    for (const member of FULL_EXTRA_MEMBERS) {
      expect(member.userIndex).toBeGreaterThanOrEqual(0)
      expect(member.userIndex).toBeLessThanOrEqual(maxUserIndex)
    }
  })

  it('should not reference out-of-bound org indexes in full extra members', () => {
    // Arrange — full preset has minimal + extra orgs
    const totalOrgs = MINIMAL_ORGS.length + FULL_EXTRA_ORGS.length
    const maxOrgIndex = totalOrgs - 1

    // Act / Assert
    for (const member of FULL_EXTRA_MEMBERS) {
      expect(member.orgIndex).toBeGreaterThanOrEqual(0)
      expect(member.orgIndex).toBeLessThanOrEqual(maxOrgIndex)
    }
  })

  it('should have unique (userIndex, orgIndex) pairs in minimal members', () => {
    // Arrange
    const keys = MINIMAL_MEMBERS.map((m) => `${m.userIndex}:${m.orgIndex}`)

    // Act
    const uniqueKeys = new Set(keys)

    // Assert
    expect(uniqueKeys.size).toBe(keys.length)
  })

  it('should have unique (userIndex, orgIndex) pairs in full extra members', () => {
    // Arrange
    const keys = FULL_EXTRA_MEMBERS.map((m) => `${m.userIndex}:${m.orgIndex}`)

    // Act
    const uniqueKeys = new Set(keys)

    // Assert
    expect(uniqueKeys.size).toBe(keys.length)
  })

  it('should have all minimal member roles be valid', () => {
    // Arrange / Act / Assert
    for (const member of MINIMAL_MEMBERS) {
      expect(VALID_ROLES).toContain(member.role)
    }
  })

  it('should have all full extra member roles be valid', () => {
    // Arrange / Act / Assert
    for (const member of FULL_EXTRA_MEMBERS) {
      expect(VALID_ROLES).toContain(member.role)
    }
  })
})

// ---------------------------------------------------------------------------
// 4. Invitation integrity (full preset)
// ---------------------------------------------------------------------------

describe('tenant fixture data — invitations', () => {
  it('should have unique invitation emails', () => {
    // Arrange
    const emails = FULL_INVITATIONS.map((inv) => inv.email)

    // Act
    const uniqueEmails = new Set(emails)

    // Assert
    expect(uniqueEmails.size).toBe(emails.length)
  })

  it('should have all inviter indexes within valid user range', () => {
    // Arrange — full preset has minimal + extra users
    const totalUsers = MINIMAL_USERS.length + FULL_EXTRA_USERS.length
    const maxUserIndex = totalUsers - 1

    // Act / Assert
    for (const inv of FULL_INVITATIONS) {
      expect(inv.inviterUserIndex).toBeGreaterThanOrEqual(0)
      expect(inv.inviterUserIndex).toBeLessThanOrEqual(maxUserIndex)
    }
  })

  it('should have all org indexes within valid org range', () => {
    // Arrange — full preset has minimal + extra orgs
    const totalOrgs = MINIMAL_ORGS.length + FULL_EXTRA_ORGS.length
    const maxOrgIndex = totalOrgs - 1

    // Act / Assert
    for (const inv of FULL_INVITATIONS) {
      expect(inv.orgIndex).toBeGreaterThanOrEqual(0)
      expect(inv.orgIndex).toBeLessThanOrEqual(maxOrgIndex)
    }
  })

  it('should have all invitation roles be valid', () => {
    // Arrange / Act / Assert
    for (const inv of FULL_INVITATIONS) {
      expect(VALID_ROLES).toContain(inv.role)
    }
  })

  it('should have all invitation emails ending with .local', () => {
    // Arrange / Act / Assert
    for (const inv of FULL_INVITATIONS) {
      expect(inv.email).toMatch(/\.local$/)
    }
  })
})

// ---------------------------------------------------------------------------
// 5. Permissions fixture data integrity
// ---------------------------------------------------------------------------

describe('permissions fixture data', () => {
  it('should have exactly 17 default permissions', () => {
    expect(DEFAULT_PERMISSIONS).toHaveLength(17)
  })

  it('should have unique resource:action pairs', () => {
    // Arrange
    const keys = DEFAULT_PERMISSIONS.map((p) => `${p.resource}:${p.action}`)

    // Act
    const uniqueKeys = new Set(keys)

    // Assert
    expect(uniqueKeys.size).toBe(keys.length)
  })

  it('should have all permissions with required fields', () => {
    for (const perm of DEFAULT_PERMISSIONS) {
      expect(perm.resource).toBeTypeOf('string')
      expect(perm.action).toBeTypeOf('string')
      expect(perm.description).toBeTypeOf('string')
      expect(perm.resource.length).toBeGreaterThan(0)
      expect(perm.action.length).toBeGreaterThan(0)
    }
  })

  it('should export a seed function', () => {
    expect(permissionsSeed).toBeTypeOf('function')
  })
})

// ---------------------------------------------------------------------------
// 6. RBAC fixture data integrity
// ---------------------------------------------------------------------------

describe('rbac fixture data', () => {
  it('should have exactly 4 default roles', () => {
    expect(DEFAULT_ROLES).toHaveLength(4)
  })

  it('should have unique role slugs', () => {
    // Arrange
    const slugs = DEFAULT_ROLES.map((r) => r.slug)

    // Act
    const uniqueSlugs = new Set(slugs)

    // Assert
    expect(uniqueSlugs.size).toBe(slugs.length)
  })

  it('should have all role permission keys reference valid permissions', () => {
    // Arrange
    const validKeys = new Set(DEFAULT_PERMISSIONS.map((p) => `${p.resource}:${p.action}`))

    // Act / Assert
    for (const role of DEFAULT_ROLES) {
      for (const permKey of role.permissions) {
        expect(validKeys.has(permKey)).toBe(true)
      }
    }
  })

  it('should have all role permission keys in resource:action format', () => {
    for (const role of DEFAULT_ROLES) {
      for (const permKey of role.permissions) {
        expect(permKey).toMatch(/^[a-z_]+:[a-z]+$/)
      }
    }
  })

  it('should export a seed function', () => {
    expect(rbacSeed).toBeTypeOf('function')
  })
})

// ---------------------------------------------------------------------------
// 7. Consent fixture
// ---------------------------------------------------------------------------

describe('consent fixture', () => {
  it('should export a seed function', () => {
    expect(consentSeed).toBeTypeOf('function')
  })
})

// ---------------------------------------------------------------------------
// 8. CLI parsing (parsePreset)
// ---------------------------------------------------------------------------

describe('parsePreset', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should export the expected valid presets', () => {
    expect(VALID_PRESETS).toEqual(['minimal', 'full'])
  })

  it('should return full by default when no --preset arg is provided', () => {
    // Act
    const result = parsePreset(['node', 'db-seed.ts'])

    // Assert
    expect(result).toBe('full')
  })

  it('should return full when --preset=full is provided', () => {
    // Act
    const result = parsePreset(['node', 'db-seed.ts', '--preset=full'])

    // Assert
    expect(result).toBe('full')
  })

  it('should exit with error for invalid preset values', () => {
    // Arrange
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Act
    parsePreset(['node', 'db-seed.ts', '--preset=bogus'])

    // Assert
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('unknown preset'))
  })

  it('should return full when --preset= flag is absent', () => {
    // Act
    const result = parsePreset(['node', 'db-seed.ts', '--verbose'])

    // Assert
    expect(result).toBe('full')
  })
})

// ---------------------------------------------------------------------------
// 9. Module exports
// ---------------------------------------------------------------------------

describe('fixture module exports', () => {
  it('should export runFixtures as a function from fixtures/index', () => {
    // Arrange / Act / Assert
    expect(runFixtures).toBeTypeOf('function')
  })

  it('should export seed from auth.fixture', () => {
    // Arrange / Act / Assert
    expect(authSeed).toBeTypeOf('function')
  })

  it('should export seed from tenant.fixture', () => {
    // Arrange / Act / Assert
    expect(tenantSeed).toBeTypeOf('function')
  })

  it('should export data arrays from auth.fixture', () => {
    // Arrange / Act / Assert
    expect(MINIMAL_USERS).toBeInstanceOf(Array)
    expect(FULL_EXTRA_USERS).toBeInstanceOf(Array)
  })

  it('should export data arrays from tenant.fixture', () => {
    // Arrange / Act / Assert
    expect(MINIMAL_ORGS).toBeInstanceOf(Array)
    expect(FULL_EXTRA_ORGS).toBeInstanceOf(Array)
    expect(MINIMAL_MEMBERS).toBeInstanceOf(Array)
    expect(FULL_EXTRA_MEMBERS).toBeInstanceOf(Array)
    expect(FULL_INVITATIONS).toBeInstanceOf(Array)
  })
})
