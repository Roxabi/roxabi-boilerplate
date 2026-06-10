import { Module } from '@nestjs/common'
import { MEMBERSHIP_REPO } from './membership.repository.js'
import { DrizzleMembershipRepository } from './repositories/drizzleMembership.repository.js'

@Module({
  providers: [{ provide: MEMBERSHIP_REPO, useClass: DrizzleMembershipRepository }],
  exports: [MEMBERSHIP_REPO],
})
export class MembershipModule {}
