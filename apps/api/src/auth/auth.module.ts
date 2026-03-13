import { forwardRef, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ApiKeyModule } from '../api-key/apiKey.module.js'
import { EmailModule } from '../email/email.module.js'
import { QueueModule } from '../queue/queue.module.js'
import { RbacModule } from '../rbac/rbac.module.js'
import { UserModule } from '../user/user.module.js'
import { AuthController } from './auth.controller.js'
import { AuthGuard } from './auth.guard.js'
import { AuthService } from './auth.service.js'
import { SessionEnrichmentService } from './sessionEnrichment.service.js'

@Module({
  imports: [
    EmailModule,
    QueueModule.forRoot(),
    RbacModule,
    forwardRef(() => UserModule),
    ApiKeyModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionEnrichmentService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService, SessionEnrichmentService],
})
export class AuthModule {}
