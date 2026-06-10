import { relations, sql } from 'drizzle-orm'
import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { organizations, users } from './auth.schema.js'
import { tenantColumn, timestamps } from './base.js'

const genId = () => crypto.randomUUID()

export const apiKeys = pgTable(
  'api_keys',
  {
    id: text('id').primaryKey().$defaultFn(genId),
    ...tenantColumn,
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    keyHash: text('key_hash').notNull().unique(),
    keySalt: text('key_salt').notNull(),
    lastFour: text('last_four').notNull(),
    scopes: text('scopes').array().notNull().default(sql`'{}'`),
    rateLimitTier: text('rate_limit_tier').notNull().default('standard'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('idx_api_keys_key_hash').on(table.keyHash),
    index('idx_api_keys_last_four').on(table.lastFour),
    index('idx_api_keys_tenant').on(table.tenantId),
    index('idx_api_keys_user').on(table.userId),
  ]
)

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  tenant: one(organizations, {
    fields: [apiKeys.tenantId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}))
