import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { Job } from 'pg-boss'
import {
  EMAIL_SEND_FAILED,
  EmailSendFailedEvent,
} from '../../common/events/emailSendFailed.event.js'
import type { EmailJobPayload } from './email.handler.js'

@Injectable()
export class EmailDlqHandler {
  private readonly logger = new Logger(EmailDlqHandler.name)

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async handle(jobs: Job<object>[]): Promise<void> {
    for (const job of jobs) {
      const { to, subject } = (job.data ?? {}) as Partial<EmailJobPayload>
      const errorMsg = `Email permanently failed after retries (job ${job.id}): to=${to}, subject=${subject}`
      this.logger.error(errorMsg)

      const error = new Error(errorMsg)
      this.eventEmitter.emit(
        EMAIL_SEND_FAILED,
        new EmailSendFailedEvent(to ?? 'unknown', subject ?? 'unknown', error)
      )
    }
  }
}
