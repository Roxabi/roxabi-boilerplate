import { Module } from '@nestjs/common'
import { DrizzleSystemSettingsRepository } from './repositories/drizzleSystemSettings.repository.js'
import { SYSTEM_SETTINGS_REPO } from './systemSettings.repository.js'
import { SystemSettingsService } from './systemSettings.service.js'

@Module({
  providers: [
    SystemSettingsService,
    { provide: SYSTEM_SETTINGS_REPO, useClass: DrizzleSystemSettingsRepository },
  ],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
