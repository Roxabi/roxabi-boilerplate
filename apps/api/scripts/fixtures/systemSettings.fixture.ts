import * as schema from '../../src/database/schema/index.js'
import type { FixtureContext, Preset, SeedResult, Tx } from './types.js'

const APP_NAME = process.env.APP_NAME ?? 'App'

export const DEFAULT_SYSTEM_SETTINGS = [
  {
    key: 'app.name',
    value: APP_NAME,
    type: 'string',
    name: 'Application Name',
    description: 'The name of the application displayed in the UI',
    category: 'General',
  },
  {
    key: 'app.supportEmail',
    value: '',
    type: 'string',
    name: 'Support Email',
    description: 'Contact email for user support inquiries',
    category: 'General',
  },
  {
    key: 'app.maintenanceMode',
    value: false,
    type: 'boolean',
    name: 'Maintenance Mode',
    description: 'When enabled, shows a maintenance page to all users',
    category: 'General',
  },
  {
    key: 'auth.signupEnabled',
    value: true,
    type: 'boolean',
    name: 'Signup Enabled',
    description: 'Allow new users to sign up',
    category: 'Authentication',
  },
  {
    key: 'auth.sessionTtlHours',
    value: 168,
    type: 'number',
    name: 'Session TTL (hours)',
    description: 'How long user sessions remain valid',
    category: 'Authentication',
  },
  {
    key: 'auth.maxLoginAttempts',
    value: 5,
    type: 'number',
    name: 'Max Login Attempts',
    description: 'Maximum failed login attempts before lockout',
    category: 'Authentication',
  },
  {
    key: 'org.maxMembers',
    value: 100,
    type: 'number',
    name: 'Max Members per Org',
    description: 'Maximum number of members allowed per organization',
    category: 'Organizations',
  },
  {
    key: 'org.allowSelfRegistration',
    value: false,
    type: 'boolean',
    name: 'Allow Org Self-Registration',
    description: 'Allow users to create their own organizations',
    category: 'Organizations',
  },
  {
    key: 'email.fromName',
    value: APP_NAME,
    type: 'string',
    name: 'Email From Name',
    description: 'Sender name for outgoing emails',
    category: 'Email',
  },
  {
    key: 'email.fromAddress',
    value: '',
    type: 'string',
    name: 'Email From Address',
    description: 'Sender email address for outgoing emails',
    category: 'Email',
  },
  {
    key: 'email.footerText',
    value: '',
    type: 'string',
    name: 'Email Footer Text',
    description: 'Text displayed in the footer of all outgoing emails',
    category: 'Email',
  },
  {
    key: 'security.passwordMinLength',
    value: 8,
    type: 'number',
    name: 'Min Password Length',
    description: 'Minimum number of characters required for passwords',
    category: 'Security',
  },
] as const

/** Insert the 12 default system settings (idempotent -- uses ON CONFLICT DO NOTHING). */
export async function seed(tx: Tx, _preset: Preset, _ctx: FixtureContext): Promise<SeedResult> {
  const result = await tx
    .insert(schema.systemSettings)
    .values(DEFAULT_SYSTEM_SETTINGS.map((s) => ({ ...s })))
    .onConflictDoNothing({ target: schema.systemSettings.key })
  return { settingCount: result.length }
}
