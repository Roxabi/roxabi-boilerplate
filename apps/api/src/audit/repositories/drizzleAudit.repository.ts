import { Inject, Injectable } from '@nestjs/common'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import { auditLogs } from '../../database/schema/audit.schema.js'
import type { AuditLogEntry, AuditRepository } from '../audit.repository.js'

// RLS-BYPASS: audit log writes must succeed regardless of tenant context — append-only, no read API
@Injectable()
export class DrizzleAuditRepository implements AuditRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(entry: AuditLogEntry, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb.insert(auditLogs).values({
      actorId: entry.actorId,
      actorType: entry.actorType,
      impersonatorId: entry.impersonatorId ?? null,
      organizationId: entry.organizationId ?? null,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      before: entry.before ?? null,
      after: entry.after ?? null,
      metadata: entry.metadata ?? null,
      apiKeyId: entry.apiKeyId ?? null,
    })
  }
}
