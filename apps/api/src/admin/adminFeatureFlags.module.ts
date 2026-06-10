import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { FeatureFlagsModule } from '../feature-flags/featureFlags.module.js'
import { AdminFeatureFlagsController } from './adminFeatureFlags.controller.js'

@Module({
  imports: [AuthModule, AuditModule, FeatureFlagsModule],
  controllers: [AdminFeatureFlagsController],
})
export class AdminFeatureFlagsModule {}
