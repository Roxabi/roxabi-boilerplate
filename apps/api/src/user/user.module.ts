import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { AccountAlreadyDeletedFilter } from './filters/accountAlreadyDeleted.filter.js'
import { AccountNotDeletedFilter } from './filters/accountNotDeleted.filter.js'
import { EmailConfirmationMismatchFilter } from './filters/emailConfirmationMismatch.filter.js'
import { TransferTargetNotMemberFilter } from './filters/transferTargetNotMember.filter.js'
import { UserNotFoundFilter } from './filters/userNotFound.filter.js'
import { UserController } from './user.controller.js'
import { UserService } from './user.service.js'
import { UserPurgeService } from './userPurge.service.js'

@Module({
  // No AuthModule import needed: the Session decorator is standalone (createParamDecorator),
  // and the APP_GUARD (AuthGuard) is globally provided by AuthModule — no circular dependency.
  controllers: [UserController],
  providers: [
    UserService,
    UserPurgeService,
    { provide: APP_FILTER, useClass: UserNotFoundFilter },
    { provide: APP_FILTER, useClass: EmailConfirmationMismatchFilter },
    { provide: APP_FILTER, useClass: TransferTargetNotMemberFilter },
    { provide: APP_FILTER, useClass: AccountAlreadyDeletedFilter },
    { provide: APP_FILTER, useClass: AccountNotDeletedFilter },
  ],
  exports: [UserService, UserPurgeService],
})
export class UserModule {}
