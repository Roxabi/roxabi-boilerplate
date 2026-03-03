import type { Logger } from '@nestjs/common'
import type { AuditAction } from '@repo/types'
import type { ClsService } from 'nestjs-cls'
import type { AuditService } from '../../audit/audit.service.js'

/**
 * Fire-and-forget audit log for user actions.
 * Logs a structured error if the audit write fails.
 */
export function logUserAudit(
  auditService: AuditService,
  logger: Logger,
  cls: ClsService,
  action: AuditAction,
  userId: string,
  actorId: string,
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined
) {
  auditService
    .log({
      actorId,
      actorType: 'user',
      action,
      resource: 'user',
      resourceId: userId,
      before: before ? { ...before } : null,
      after: after ? { ...after } : null,
    })
    .catch((err) => {
      logger.error(
        { correlationId: cls.getId(), action, error: (err as Error).message },
        'Audit log write failed'
      )
    })
}

/**
 * Fire-and-forget audit log for organization actions.
 * Logs a structured error if the audit write fails.
 */
export function logOrgAudit(
  auditService: AuditService,
  logger: Logger,
  cls: ClsService,
  action: AuditAction,
  orgId: string,
  actorId: string,
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined
) {
  auditService
    .log({
      actorId,
      actorType: 'user',
      action,
      resource: 'organization',
      resourceId: orgId,
      organizationId: orgId,
      before: before ? { ...before } : null,
      after: after ? { ...after } : null,
    })
    .catch((err) => {
      logger.error(
        { correlationId: cls.getId(), action, error: (err as Error).message },
        'Audit log write failed'
      )
    })
}
