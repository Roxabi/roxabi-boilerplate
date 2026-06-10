import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { Job } from 'pg-boss'
import {
  EMAIL_SEND_FAILED,
  EmailSendFailedEvent,
} from '../../common/events/emailSendFailed.event.js'
import type { EmailJobPayload } from './email.handler.js'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!(local && domain)) return '***'
  return `${local[0]}***@${domain}`
}

@Injectable()
export class EmailDlqHandler {
  private readonly logger = new Logger(EmailDlqHandler.name)

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async handle(jobs: Job<object>[]): Promise<void> {
    for (const job of jobs) {
      const { to, subject } = (job.data ?? {}) as Partial<EmailJobPayload>
      const errorMsg = `Email permanently failed after retries (job ${job.id}): to=${maskEmail(to ?? 'unknown')}, subject=${subject}`
      this.logger.error(errorMsg)

      const error = new Error(errorMsg)
      this.eventEmitter.emit(
        EMAIL_SEND_FAILED,
        new EmailSendFailedEvent(to ?? 'unknown', subject ?? 'unknown', error)
      )
    }
  }
}
