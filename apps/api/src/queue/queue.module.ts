import { Module } from '@nestjs/common'
import { EmailModule } from '../email/email.module.js'
import { EmailQueueHandler } from './handlers/email.handler.js'
import { EmailDlqHandler } from './handlers/emailDlq.handler.js'
import { QUEUE_DEFAULTS, QUEUE_NAMES } from './queue.constants.js'
import { QUEUE_SERVICE } from './queue.provider.js'
import { QueueService } from './queue.service.js'

@Module({
  imports: [EmailModule],
  providers: [
    QueueService,
    {
      provide: QUEUE_SERVICE,
      useExisting: QueueService,
    },
    EmailQueueHandler,
    EmailDlqHandler,
    {
      provide: 'QUEUE_REGISTRAR',
      inject: [QueueService, EmailQueueHandler, EmailDlqHandler],
      useFactory: (
        queueService: QueueService,
        emailHandler: EmailQueueHandler,
        dlqHandler: EmailDlqHandler
      ) => {
        // Register queues
        queueService.registerQueue({
          name: QUEUE_NAMES.EMAIL_SEND,
          retryLimit: QUEUE_DEFAULTS.retryLimit,
          retryDelay: QUEUE_DEFAULTS.retryDelay,
          retryBackoff: QUEUE_DEFAULTS.retryBackoff,
          deadLetter: QUEUE_NAMES.EMAIL_DLQ,
        })
        queueService.registerQueue({
          name: QUEUE_NAMES.EMAIL_DLQ,
        })

        // Register handlers
        queueService.registerHandler(
          QUEUE_NAMES.EMAIL_SEND,
          emailHandler.handle.bind(emailHandler),
          {
            batchSize: QUEUE_DEFAULTS.batchSize,
            pollingIntervalSeconds: QUEUE_DEFAULTS.pollingIntervalSeconds,
          }
        )
        queueService.registerHandler(QUEUE_NAMES.EMAIL_DLQ, dlqHandler.handle.bind(dlqHandler))

        return true
      },
    },
  ],
  exports: [QueueService, QUEUE_SERVICE],
})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS dynamic module pattern requires a class with static forRoot()
export class QueueModule {
  static forRoot() {
    return {
      module: QueueModule,
    }
  }
}
