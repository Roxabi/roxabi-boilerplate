import { Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { DatabaseUnavailableFilter } from './filters/databaseUnavailable.filter.js'
import { TenantContextMissingFilter } from './filters/tenantContextMissing.filter.js'
import {
  DrizzleOrganizationLookupRepository,
  ORGANIZATION_LOOKUP_REPO,
} from './organizationLookup.repository.js'
import { TenantInterceptor } from './tenant.interceptor.js'
import { TenantService } from './tenant.service.js'

@Module({
  providers: [
    TenantService,
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
    {
      provide: ORGANIZATION_LOOKUP_REPO,
      useClass: DrizzleOrganizationLookupRepository,
    },
  ],
  exports: [TenantService, ORGANIZATION_LOOKUP_REPO],
})
export class TenantModule {}
