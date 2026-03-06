import { hashPassword } from 'better-auth/crypto'
import * as schema from '../../src/database/schema/index.js'
import type { FixtureContext, Preset, SeedResult, Tx } from './types.js'

const slug = process.env.APP_SLUG ?? process.env.POSTGRES_DB ?? 'app'

export type UserDef = {
  email: string
  name: string
  emailVerified?: boolean
  role?: string
}

export const MINIMAL_USERS: UserDef[] = [
  { email: `dev@${slug}.local`, name: 'Dev User' },
  { email: `admin@${slug}.local`, name: 'Admin User' },
  { email: `viewer@${slug}.local`, name: 'Viewer User' },
  { email: `superadmin@${slug}.local`, name: 'Super Admin', role: 'superadmin' },
]

export const FULL_EXTRA_USERS: UserDef[] = [
  { email: `manager@${slug}.local`, name: 'Manager User' },
  { email: `editor@${slug}.local`, name: 'Editor User' },
  { email: `analyst@${slug}.local`, name: 'Analyst User' },
  { email: `support@${slug}.local`, name: 'Support User' },
  { email: `designer@${slug}.local`, name: 'Designer User' },
  { email: `devops@${slug}.local`, name: 'DevOps User' },
  { email: `marketing@${slug}.local`, name: 'Marketing User' },
  { email: `sales@${slug}.local`, name: 'Sales User' },
  { email: `intern@${slug}.local`, name: 'Intern User', emailVerified: false },
]

/** Create users and credential accounts. All users get password "password123". Intern is unverified. */
export async function seed(tx: Tx, preset: Preset, ctx: FixtureContext): Promise<SeedResult> {
  const users = preset === 'full' ? [...MINIMAL_USERS, ...FULL_EXTRA_USERS] : MINIMAL_USERS
  const hashedPassword = await hashPassword('password123')

  const userIds = users.map(() => crypto.randomUUID())

  await tx.insert(schema.users).values(
    users.map((userDef, i) => ({
      id: userIds[i],
      name: userDef.name,
      email: userDef.email,
      emailVerified: userDef.emailVerified !== false,
      ...(userDef.role ? { role: userDef.role } : {}),
    }))
  )

  await tx.insert(schema.accounts).values(
    users.map((_, i) => ({
      id: crypto.randomUUID(),
      userId: userIds[i],
      accountId: userIds[i],
      providerId: 'credential',
      password: hashedPassword,
    }))
  )

  ctx.userIds.push(...userIds)
  return { userCount: users.length }
}
