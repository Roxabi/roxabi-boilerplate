import * as schema from '../../src/database/schema/index.js'
import type { FixtureContext, Preset, SeedResult, Tx } from './types.js'

const slug = process.env.APP_SLUG ?? process.env.POSTGRES_DB ?? 'app'
const orgName = slug.charAt(0).toUpperCase() + slug.slice(1)

export type OrgDef = {
  name: string
  slug: string
}

export type MemberDef = {
  userIndex: number // index into ctx.userIds
  orgIndex: number // index into ctx.orgIds
  role: string
}

export type InvitationDef = {
  orgIndex: number
  inviterUserIndex: number
  email: string
  role: string
}

export const MINIMAL_ORGS: OrgDef[] = [
  { name: orgName, slug },
  { name: 'Acme Corp', slug: 'acme-corp' },
]

export const FULL_EXTRA_ORGS: OrgDef[] = [
  { name: 'Startup Inc', slug: 'startup-inc' },
  { name: 'Agency Pro', slug: 'agency-pro' },
]

/**
 * Minimal members mapping:
 *   user 0 (dev)        -> org 0 (${APP_SLUG}) as owner
 *   user 0 (dev)        -> org 1 (Acme Corp)  as admin   (cross-org)
 *   user 1 (admin)      -> org 0 (${APP_SLUG}) as admin
 *   user 2 (viewer)     -> org 0 (${APP_SLUG}) as viewer
 *   user 2 (viewer)     -> org 1 (Acme Corp)  as member
 *   user 3 (superadmin) -> org 0 (${APP_SLUG}) as owner
 */
export const MINIMAL_MEMBERS: MemberDef[] = [
  { userIndex: 0, orgIndex: 0, role: 'owner' },
  { userIndex: 0, orgIndex: 1, role: 'admin' },
  { userIndex: 1, orgIndex: 0, role: 'admin' },
  { userIndex: 2, orgIndex: 0, role: 'viewer' },
  { userIndex: 2, orgIndex: 1, role: 'member' },
  { userIndex: 3, orgIndex: 0, role: 'owner' },
]

/**
 * Full preset extra members (indexes 4-12 are the extra users).
 * Spread across all 4 orgs with realistic role assignments.
 * Some users appear in multiple orgs (cross-org members).
 *
 * Note: indexes shifted by +1 vs original because superadmin was added
 * at index 3 in MINIMAL_USERS.
 */
export const FULL_EXTRA_MEMBERS: MemberDef[] = [
  // Acme Corp — populate with several users
  { userIndex: 4, orgIndex: 1, role: 'owner' }, // manager -> Acme owner
  { userIndex: 5, orgIndex: 1, role: 'admin' }, // editor -> Acme admin
  { userIndex: 6, orgIndex: 1, role: 'member' }, // analyst -> Acme member
  { userIndex: 7, orgIndex: 1, role: 'viewer' }, // support -> Acme viewer

  // Startup Inc
  { userIndex: 8, orgIndex: 2, role: 'owner' }, // designer -> Startup owner
  { userIndex: 9, orgIndex: 2, role: 'admin' }, // devops -> Startup admin
  { userIndex: 10, orgIndex: 2, role: 'member' }, // marketing -> Startup member
  { userIndex: 0, orgIndex: 2, role: 'member' }, // dev -> Startup member (cross-org)

  // Agency Pro
  { userIndex: 11, orgIndex: 3, role: 'owner' }, // sales -> Agency owner
  { userIndex: 12, orgIndex: 3, role: 'admin' }, // intern -> Agency admin
  { userIndex: 4, orgIndex: 3, role: 'member' }, // manager -> Agency member (cross-org)
  { userIndex: 6, orgIndex: 3, role: 'viewer' }, // analyst -> Agency viewer (cross-org)

  // Additional cross-org for ${APP_SLUG}
  { userIndex: 7, orgIndex: 0, role: 'member' }, // support -> ${APP_SLUG} member (cross-org)
]

/** Full preset pending invitations. */
export const FULL_INVITATIONS: InvitationDef[] = [
  // ${APP_SLUG} (2 pending)
  { orgIndex: 0, inviterUserIndex: 0, email: `invite1@${slug}.local`, role: 'member' },
  { orgIndex: 0, inviterUserIndex: 0, email: `invite2@${slug}.local`, role: 'viewer' },

  // Acme Corp (3 pending)
  { orgIndex: 1, inviterUserIndex: 4, email: 'invite3@acme.local', role: 'member' },
  { orgIndex: 1, inviterUserIndex: 4, email: 'invite4@acme.local', role: 'admin' },
  { orgIndex: 1, inviterUserIndex: 5, email: 'invite5@acme.local', role: 'viewer' },

  // Startup Inc (2 pending)
  { orgIndex: 2, inviterUserIndex: 8, email: 'invite6@startup.local', role: 'member' },
  { orgIndex: 2, inviterUserIndex: 8, email: 'invite7@startup.local', role: 'member' },

  // Agency Pro (3 pending)
  { orgIndex: 3, inviterUserIndex: 11, email: 'invite8@agency.local', role: 'member' },
  { orgIndex: 3, inviterUserIndex: 11, email: 'invite9@agency.local', role: 'admin' },
  { orgIndex: 3, inviterUserIndex: 12, email: 'invite10@agency.local', role: 'viewer' },
]

/** Create organizations, members, and (for full preset) invitations. */
export async function seed(tx: Tx, preset: Preset, ctx: FixtureContext): Promise<SeedResult> {
  const orgs = preset === 'full' ? [...MINIMAL_ORGS, ...FULL_EXTRA_ORGS] : MINIMAL_ORGS
  const memberDefs =
    preset === 'full' ? [...MINIMAL_MEMBERS, ...FULL_EXTRA_MEMBERS] : MINIMAL_MEMBERS

  // Create organizations
  for (const orgDef of orgs) {
    const orgId = crypto.randomUUID()
    await tx.insert(schema.organizations).values({
      id: orgId,
      name: orgDef.name,
      slug: orgDef.slug,
    })
    ctx.orgIds.push(orgId)
  }

  // Create members (roleId null — patched later by rbac fixture)
  for (const memberDef of memberDefs) {
    const memberId = crypto.randomUUID()
    const orgId = ctx.orgIds[memberDef.orgIndex]
    await tx.insert(schema.members).values({
      id: memberId,
      userId: ctx.userIds[memberDef.userIndex],
      organizationId: orgId,
      role: memberDef.role,
      roleId: null,
    })
    ctx.memberIds.push(memberId)
    const orgMembers = ctx.membersByOrg.get(orgId) ?? []
    orgMembers.push({ id: memberId, roleSlug: memberDef.role })
    ctx.membersByOrg.set(orgId, orgMembers)
  }

  // Create invitations (full preset only)
  let invitationCount = 0
  if (preset === 'full') {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7) // expires 7 days from now

    for (const inv of FULL_INVITATIONS) {
      await tx.insert(schema.invitations).values({
        id: crypto.randomUUID(),
        organizationId: ctx.orgIds[inv.orgIndex],
        inviterId: ctx.userIds[inv.inviterUserIndex],
        email: inv.email,
        role: inv.role,
        status: 'pending',
        expiresAt: futureDate,
      })
      invitationCount++
    }
  }

  return { orgCount: orgs.length, memberCount: memberDefs.length, invitationCount }
}
