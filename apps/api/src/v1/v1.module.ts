import { Module } from '@nestjs/common'
import { AdminModule } from '../admin/admin.module.js'
import { OrganizationModule } from '../organization/organization.module.js'
import { RbacModule } from '../rbac/rbac.module.js'
import { UserModule } from '../user/user.module.js'
import { V1InvitationsController } from './controllers/v1Invitations.controller.js'
import { V1MembersController } from './controllers/v1Members.controller.js'
import { V1OrganizationsController } from './controllers/v1Organizations.controller.js'
import { V1RolesController } from './controllers/v1Roles.controller.js'
import { V1UsersController } from './controllers/v1Users.controller.js'
import { V1ExceptionFilter } from './filters/v1Exception.filter.js'

@Module({
  imports: [UserModule, OrganizationModule, AdminModule, RbacModule],
  controllers: [
    V1UsersController,
    V1OrganizationsController,
    V1MembersController,
    V1InvitationsController,
    V1RolesController,
  ],
  providers: [V1ExceptionFilter],
})
export class V1Module {}
