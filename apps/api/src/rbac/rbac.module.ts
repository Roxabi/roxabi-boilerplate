import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { TenantModule } from '../tenant/tenant.module.js'
import { RbacExceptionFilter } from './filters/rbacException.filter.js'
import { PermissionService } from './permission.service.js'
import { RbacController } from './rbac.controller.js'
import { RbacListener } from './rbac.listener.js'
import { RbacService } from './rbac.service.js'
import { RbacMemberService } from './rbacMember.service.js'

@Module({
  imports: [TenantModule],
  controllers: [RbacController],
  providers: [
    RbacService,
    RbacMemberService,
    PermissionService,
    RbacListener,
    { provide: APP_FILTER, useClass: RbacExceptionFilter },
  ],
  exports: [RbacService, RbacMemberService, PermissionService],
})
export class RbacModule {}
