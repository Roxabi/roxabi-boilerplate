import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { AdminUsersController } from './adminUsers.controller.js'
import { AdminUsersLifecycleService } from './adminUsers.lifecycle.js'
import { AdminUsersQueryService } from './adminUsers.query.js'
import { AdminUsersService } from './adminUsers.service.js'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService, AdminUsersQueryService, AdminUsersLifecycleService],
  exports: [AdminUsersService, AdminUsersQueryService, AdminUsersLifecycleService],
})
export class AdminUsersModule {}
