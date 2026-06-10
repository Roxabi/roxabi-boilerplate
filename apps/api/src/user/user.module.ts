import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { MembershipModule } from '../membership/membership.module.js'
import { AccountAlreadyDeletedFilter } from './filters/accountAlreadyDeleted.filter.js'
import { AccountNotDeletedFilter } from './filters/accountNotDeleted.filter.js'
import { EmailConfirmationMismatchFilter } from './filters/emailConfirmationMismatch.filter.js'
import { TransferTargetNotMemberFilter } from './filters/transferTargetNotMember.filter.js'
import { UserNotFoundFilter } from './filters/userNotFound.filter.js'
import { DrizzleUserRepository } from './repositories/drizzleUser.repository.js'
import { DrizzleUserPurgeRepository } from './repositories/drizzleUserPurge.repository.js'
import { UserController } from './user.controller.js'
import { USER_REPO } from './user.repository.js'
import { UserService } from './user.service.js'
import { USER_PURGE_REPO } from './userPurge.repository.js'
import { UserPurgeService } from './userPurge.service.js'

@Module({
  imports: [MembershipModule],
  controllers: [UserController],
  providers: [
    UserService,
    UserPurgeService,
    { provide: USER_REPO, useClass: DrizzleUserRepository },
    { provide: USER_PURGE_REPO, useClass: DrizzleUserPurgeRepository },
    { provide: APP_FILTER, useClass: UserNotFoundFilter },
    { provide: APP_FILTER, useClass: EmailConfirmationMismatchFilter },
    { provide: APP_FILTER, useClass: TransferTargetNotMemberFilter },
    { provide: APP_FILTER, useClass: AccountAlreadyDeletedFilter },
    { provide: APP_FILTER, useClass: AccountNotDeletedFilter },
  ],
  exports: [UserService, UserPurgeService, USER_PURGE_REPO],
})
export class UserModule {}
