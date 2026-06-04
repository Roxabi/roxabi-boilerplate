import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { AdminAuditLogsController } from './adminAuditLogs.controller.js'
import { AdminAuditLogsService } from './adminAuditLogs.service.js'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AdminAuditLogsController],
  providers: [AdminAuditLogsService],
  exports: [AdminAuditLogsService],
})
export class AdminAuditLogsModule {}
