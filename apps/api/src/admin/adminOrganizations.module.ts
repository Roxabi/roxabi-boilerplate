import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { AdminMembersModule } from './adminMembers.module.js'
import { AdminOrganizationsController } from './adminOrganizations.controller.js'
import { AdminOrganizationsDeletionService } from './adminOrganizations.deletion.js'
import { AdminOrganizationsQueryService } from './adminOrganizations.query.js'
import { AdminOrganizationsService } from './adminOrganizations.service.js'

@Module({
  imports: [AuthModule, AuditModule, AdminMembersModule],
  controllers: [AdminOrganizationsController],
  providers: [
    AdminOrganizationsService,
    AdminOrganizationsQueryService,
    AdminOrganizationsDeletionService,
  ],
  exports: [
    AdminOrganizationsService,
    AdminOrganizationsQueryService,
    AdminOrganizationsDeletionService,
  ],
})
export class AdminOrganizationsModule {}
