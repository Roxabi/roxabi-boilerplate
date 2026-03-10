import { Module } from '@nestjs/common'
import { FEATURE_FLAG_REPO } from './featureFlags.repository.js'
import { FeatureFlagService } from './featureFlags.service.js'
import { DrizzleFeatureFlagRepository } from './repositories/drizzleFeatureFlags.repository.js'

@Module({
  providers: [
    FeatureFlagService,
    { provide: FEATURE_FLAG_REPO, useClass: DrizzleFeatureFlagRepository },
  ],
  exports: [FeatureFlagService],
})
export class FeatureFlagsModule {}
