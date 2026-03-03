import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { TenantModule } from '../tenant/tenant.module.js'
import { RbacExceptionFilter } from './filters/rbacException.filter.js'
import { PermissionService } from './permission.service.js'
import { RbacController } from './rbac.controller.js'
import { RbacListener } from './rbac.listener.js'
import { RbacService } from './rbac.service.js'

@Module({
  imports: [TenantModule],
  controllers: [RbacController],
  providers: [
    RbacService,
    PermissionService,
    RbacListener,
    { provide: APP_FILTER, useClass: RbacExceptionFilter },
  ],
  exports: [RbacService, PermissionService],
})
export class RbacModule {}
