import type { AuditAction, AuditActorType } from '@repo/types'
import type { DrizzleTx } from '../database/drizzle.provider.js'

export const AUDIT_REPO = Symbol('AUDIT_REPO')

export type AuditLogEntry = {
  actorId: string
  actorType: AuditActorType
  impersonatorId?: string
  organizationId?: string
  action: AuditAction
  resource: string
  resourceId: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  apiKeyId?: string
}

export interface AuditRepository {
  create(entry: AuditLogEntry, tx?: DrizzleTx): Promise<void>
}
