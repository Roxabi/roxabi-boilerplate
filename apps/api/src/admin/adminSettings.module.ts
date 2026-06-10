import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { SystemSettingsModule } from '../system-settings/systemSettings.module.js'
import { AdminSettingsController } from './adminSettings.controller.js'

@Module({
  imports: [AuthModule, AuditModule, SystemSettingsModule],
  controllers: [AdminSettingsController],
})
export class AdminSettingsModule {}
