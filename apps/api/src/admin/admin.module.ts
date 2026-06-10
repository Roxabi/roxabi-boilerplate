import { Module } from '@nestjs/common'
import { AdminAuditLogsModule } from './adminAuditLogs.module.js'
import { AdminFeatureFlagsModule } from './adminFeatureFlags.module.js'
import { AdminMembersModule } from './adminMembers.module.js'
import { AdminOrganizationsModule } from './adminOrganizations.module.js'
import { AdminSettingsModule } from './adminSettings.module.js'
import { AdminUsersModule } from './adminUsers.module.js'

/**
 * AdminModule is a thin compatibility wrapper that re-exports all admin sub-modules.
 *
 * @deprecated Prefer importing the specific sub-module (AdminUsersModule,
 * AdminOrganizationsModule, AdminMembersModule, AdminAuditLogsModule, etc.)
 * to avoid pulling in unused providers.
 */
@Module({
  imports: [
    AdminUsersModule,
    AdminOrganizationsModule,
    AdminMembersModule,
    AdminAuditLogsModule,
    AdminSettingsModule,
    AdminFeatureFlagsModule,
  ],
  exports: [
    AdminUsersModule,
    AdminOrganizationsModule,
    AdminMembersModule,
    AdminAuditLogsModule,
    AdminSettingsModule,
    AdminFeatureFlagsModule,
  ],
})
export class AdminModule {}
