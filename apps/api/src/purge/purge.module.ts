import { Module } from '@nestjs/common'
import { UserModule } from '../user/user.module.js'
import { PurgeController } from './purge.controller.js'
import { PurgeService } from './purge.service.js'
import {
  DrizzleOrganizationPurgeRepository,
  ORGANIZATION_PURGE_REPO,
} from './repositories/organizationPurge.repository.js'

@Module({
  imports: [UserModule],
  controllers: [PurgeController],
  providers: [
    PurgeService,
    { provide: ORGANIZATION_PURGE_REPO, useClass: DrizzleOrganizationPurgeRepository },
  ],
})
export class PurgeModule {}
