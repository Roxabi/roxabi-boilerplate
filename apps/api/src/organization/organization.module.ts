import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { AuthModule } from '../auth/auth.module.js'
import {
  OrgNameConfirmationMismatchFilter,
  OrgNotDeletedFilter,
  OrgNotOwnerFilter,
} from './filters/orgForbidden.filter.js'
import { OrgNotFoundFilter } from './filters/orgNotFound.filter.js'
import { ORG_REPO } from './org.repository.js'
import { OrganizationController } from './organization.controller.js'
import { OrganizationService } from './organization.service.js'
import { DrizzleOrgRepository } from './repositories/drizzleOrg.repository.js'

@Module({
  imports: [AuthModule],
  controllers: [OrganizationController],
  providers: [
    OrganizationService,
    { provide: ORG_REPO, useClass: DrizzleOrgRepository },
    { provide: APP_FILTER, useClass: OrgNotFoundFilter },
    { provide: APP_FILTER, useClass: OrgNotOwnerFilter },
    { provide: APP_FILTER, useClass: OrgNameConfirmationMismatchFilter },
    { provide: APP_FILTER, useClass: OrgNotDeletedFilter },
  ],
  exports: [OrganizationService, ORG_REPO],
})
export class OrganizationModule {}
