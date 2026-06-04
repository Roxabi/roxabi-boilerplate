import { isNotNull } from 'drizzle-orm'
import {
  type AnyPgColumn,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { timestamps } from './timestamps.js'

const genId = () => crypto.randomUUID()

// NOTE: Auth tables (users, accounts, sessions, verifications) are user-global
// and do not carry tenantId. RLS is applied at the api_keys / roles / members
// layer instead. User-level access is enforced by AuthGuard and session checks.

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(genId),
    name: text('name').notNull(),
    firstName: text('first_name').notNull().default(''),
    lastName: text('last_name').notNull().default(''),
    fullNameCustomized: boolean('full_name_customized').notNull().default(false),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    avatarSeed: text('avatar_seed'),
    avatarStyle: text('avatar_style').default('lorelei'),
    avatarOptions: jsonb('avatar_options').notNull().default({}).$type<Record<string, unknown>>(),
    locale: text('locale').notNull().default('en'),
    role: text('role').default('user'),
    banned: boolean('banned').default(false),
    banReason: text('ban_reason'),
    banExpires: timestamp('ban_expires'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deleteScheduledFor: timestamp('delete_scheduled_for', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('users_deleted_at_idx').on(table.deletedAt).where(isNotNull(table.deletedAt)),
    index('users_delete_scheduled_for_idx')
      .on(table.deleteScheduledFor)
      .where(isNotNull(table.deleteScheduledFor)),
    index('idx_users_cursor').on(table.createdAt.desc(), table.id.desc()),
  ]
)

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey().$defaultFn(genId),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    activeOrganizationId: text('active_organization_id'),
    ...timestamps,
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)]
)

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey().$defaultFn(genId),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    ...timestamps,
  },
  (table) => [index('accounts_user_id_idx').on(table.userId)]
)

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey().$defaultFn(genId),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  ...timestamps,
})

export const organizations = pgTable(
  'organizations',
  {
    id: text('id').primaryKey().$defaultFn(genId),
    name: text('name').notNull(),
    slug: text('slug').unique(),
    logo: text('logo'),
    metadata: text('metadata'),
    parentOrganizationId: text('parent_organization_id').references(
      (): AnyPgColumn => organizations.id
    ),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deleteScheduledFor: timestamp('delete_scheduled_for', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('organizations_deleted_at_idx').on(table.deletedAt).where(isNotNull(table.deletedAt)),
    index('organizations_delete_scheduled_for_idx')
      .on(table.deleteScheduledFor)
      .where(isNotNull(table.deleteScheduledFor)),
    index('idx_orgs_cursor').on(table.createdAt.desc(), table.id.desc()),
    index('idx_orgs_parent_org').on(table.parentOrganizationId),
  ]
)

export const members = pgTable(
  'members',
  {
    id: text('id').primaryKey().$defaultFn(genId),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    roleId: text('role_id'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('members_user_id_idx').on(table.userId),
    index('members_organization_id_idx').on(table.organizationId),
    index('members_role_id_idx').on(table.roleId),
    index('members_deleted_at_idx').on(table.deletedAt).where(isNotNull(table.deletedAt)),
  ]
)

export const invitations = pgTable(
  'invitations',
  {
    id: text('id').primaryKey().$defaultFn(genId),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').notNull().default('member'),
    status: text('status').notNull().default('pending'),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => [
    index('invitations_organization_id_idx').on(table.organizationId),
    index('invitations_inviter_id_idx').on(table.inviterId),
    unique('invitations_org_email_unique').on(table.organizationId, table.email),
  ]
)
