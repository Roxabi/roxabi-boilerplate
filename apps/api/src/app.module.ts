import { randomUUID } from 'node:crypto'
import type { ServerResponse } from 'node:http'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER } from '@nestjs/core'
import { EventEmitterModule } from '@nestjs/event-emitter'
import type { FastifyRequest } from 'fastify'
import { ClsModule } from 'nestjs-cls'
import { AdminModule } from './admin/admin.module.js'
import { ApiKeyModule } from './api-key/apiKey.module.js'
import { AppController } from './app.controller.js'
import { AuditModule } from './audit/audit.module.js'
import { AuthModule } from './auth/auth.module.js'
import { extractCorrelationId } from './common/correlationId.util.js'
import { AllExceptionsFilter } from './common/filters/allExceptions.filter.js'
import { validate } from './config/env.validation.js'
import { ConsentModule } from './consent/consent.module.js'
import { DatabaseModule } from './database/database.module.js'
import { EmailModule } from './email/email.module.js'
import { FeatureFlagsModule } from './feature-flags/featureFlags.module.js'
import { GdprModule } from './gdpr/gdpr.module.js'
import { OrganizationModule } from './organization/organization.module.js'
import { PurgeModule } from './purge/purge.module.js'
import { RbacModule } from './rbac/rbac.module.js'
import { SystemSettingsModule } from './system-settings/systemSettings.module.js'
import { TenantModule } from './tenant/tenant.module.js'
import { ThrottlerConfigModule } from './throttler/throttler.module.js'
import { UserModule } from './user/user.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Load .env from monorepo root — all env vars are centralized there (no per-app .env files)
      envFilePath: ['../../.env.local', '../../.env'],
      validate,
    }),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: FastifyRequest) => {
          return extractCorrelationId(req.headers['x-correlation-id']) ?? randomUUID()
        },
        setup: (cls, _req: FastifyRequest, res: ServerResponse) => {
          res.setHeader('x-correlation-id', cls.getId())
        },
      },
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    EmailModule,
    AuditModule,
    AuthModule,
    TenantModule,
    UserModule,
    OrganizationModule,
    PurgeModule,
    RbacModule,
    ConsentModule,
    GdprModule,
    FeatureFlagsModule,
    SystemSettingsModule,
    AdminModule,
    ApiKeyModule,
    ThrottlerConfigModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
