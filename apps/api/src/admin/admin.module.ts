import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { FeatureFlagsModule } from '../feature-flags/featureFlags.module.js'
import { SystemSettingsModule } from '../system-settings/systemSettings.module.js'
import { AdminAuditLogsController } from './adminAuditLogs.controller.js'
import { AdminAuditLogsService } from './adminAuditLogs.service.js'
import { AdminFeatureFlagsController } from './adminFeatureFlags.controller.js'
import { AdminInvitationsController } from './adminInvitations.controller.js'
import { AdminInvitationsService } from './adminInvitations.service.js'
import { AdminMembersController } from './adminMembers.controller.js'
import { AdminMembersService } from './adminMembers.service.js'
import { AdminOrganizationsController } from './adminOrganizations.controller.js'
import { AdminOrganizationsDeletionService } from './adminOrganizations.deletion.js'
import { AdminOrganizationsQueryService } from './adminOrganizations.query.js'
import { AdminOrganizationsService } from './adminOrganizations.service.js'
import { AdminSettingsController } from './adminSettings.controller.js'
import { AdminUsersController } from './adminUsers.controller.js'
import { AdminUsersLifecycleService } from './adminUsers.lifecycle.js'
import { AdminUsersQueryService } from './adminUsers.query.js'
import { AdminUsersService } from './adminUsers.service.js'

@Module({
  imports: [AuthModule, AuditModule, SystemSettingsModule, FeatureFlagsModule],
  controllers: [
    AdminMembersController,
    AdminInvitationsController,
    AdminUsersController,
    AdminOrganizationsController,
    AdminAuditLogsController,
    AdminSettingsController,
    AdminFeatureFlagsController,
  ],
  providers: [
    AdminMembersService,
    AdminInvitationsService,
    AdminUsersService,
    AdminUsersQueryService,
    AdminUsersLifecycleService,
    AdminOrganizationsService,
    AdminOrganizationsQueryService,
    AdminOrganizationsDeletionService,
    AdminAuditLogsService,
  ],
  exports: [
    AdminMembersService,
    AdminInvitationsService,
    AdminUsersService,
    AdminUsersQueryService,
    AdminUsersLifecycleService,
    AdminOrganizationsService,
    AdminOrganizationsQueryService,
    AdminOrganizationsDeletionService,
    AdminAuditLogsService,
  ],
})
export class AdminModule {}
