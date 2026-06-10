import { Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { DatabaseUnavailableFilter } from './filters/databaseUnavailable.filter.js'
import { TenantContextMissingFilter } from './filters/tenantContextMissing.filter.js'
import { DrizzleTenantRepository } from './repositories/drizzleTenant.repository.js'
import { DeletedOrgRestrictionService } from './services/deletedOrgRestriction.service.js'
import { TenantInterceptor } from './tenant.interceptor.js'
import { TENANT_REPO } from './tenant.repository.js'
import { TenantService } from './tenant.service.js'

@Module({
  providers: [
    TenantService,
    { provide: TENANT_REPO, useClass: DrizzleTenantRepository },
    DeletedOrgRestrictionService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: TenantContextMissingFilter,
    },
    {
      provide: APP_FILTER,
      useClass: DatabaseUnavailableFilter,
    },
  ],
  exports: [TenantService],
})
export class TenantModule {}
