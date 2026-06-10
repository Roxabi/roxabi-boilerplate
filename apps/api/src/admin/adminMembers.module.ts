import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { AdminInvitationsController } from './adminInvitations.controller.js'
import { AdminInvitationsService } from './adminInvitations.service.js'
import { AdminMembersController } from './adminMembers.controller.js'
import { AdminMembersService } from './adminMembers.service.js'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AdminMembersController, AdminInvitationsController],
  providers: [AdminMembersService, AdminInvitationsService],
  exports: [AdminMembersService, AdminInvitationsService],
})
export class AdminMembersModule {}
