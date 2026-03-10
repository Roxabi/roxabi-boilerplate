/** Sensitive fields that must be redacted in audit log before/after data */
export const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'secret',
  'secretKey',
  'secret_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'idToken',
  'apiKey',
  'api_key',
  'clientSecret',
  'client_secret',
  'privateKey',
  'private_key',
  'authorization',
  'cookie',
] as const

export type AuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.banned'
  | 'user.unbanned'
  | 'user.deleted'
  | 'user.restored'
  | 'user.role_changed'
  | 'member.invited'
  | 'member.role_changed'
  | 'member.removed'
  | 'invitation.revoked'
  | 'org.created'
  | 'org.updated'
  | 'org.deleted'
  | 'org.restored'
  | 'org.parent_changed'
  | 'settings.updated'
  | 'flag.created'
  | 'flag.updated'
  | 'flag.toggled'
  | 'flag.deleted'
  | 'impersonation.started'
  | 'impersonation.ended'
  | 'api_key.created'
  | 'api_key.revoked'

export type AuditActorType = 'user' | 'system' | 'impersonation' | 'api_key'

export interface AuditLogEntry {
  id: string
  timestamp: Date
  actorId: string
  actorType: AuditActorType
  impersonatorId: string | null
  organizationId: string | null
  action: AuditAction
  resource: string
  resourceId: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  apiKeyId: string | null
}
