import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { validate } from './config/env.validation.js'
import { DatabaseModule } from './database/database.module.js'
import { EmailModule } from './email/email.module.js'
import { QueueModule } from './queue/queue.module.js'

/**
 * Lightweight module for queue worker process.
 * No HTTP, no auth, no admin, no throttler — only what's needed for queue processing.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.local', '../../.env'],
      validate,
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    EmailModule,
    QueueModule.forRoot(),
  ],
})
export class WorkerAppModule {}
