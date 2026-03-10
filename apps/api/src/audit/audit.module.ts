import { Module } from '@nestjs/common'
import { AUDIT_REPO } from './audit.repository.js'
import { AuditService } from './audit.service.js'
import { DrizzleAuditRepository } from './repositories/drizzleAudit.repository.js'

@Module({
  providers: [AuditService, { provide: AUDIT_REPO, useClass: DrizzleAuditRepository }],
  exports: [AuditService],
})
export class AuditModule {}
