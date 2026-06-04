import { Inject, Injectable, Logger } from '@nestjs/common'
import type { Job } from 'pg-boss'
import { EMAIL_PROVIDER, type EmailProvider } from '../../email/email.provider.js'

export type EmailJobPayload = {
  to: string
  subject: string
  html: string
  text?: string
}

export type EmailBatchResult = {
  succeeded: string[]
  failed: Array<{ jobId: string; error: string }>
}

@Injectable()
export class EmailQueueHandler {
  private readonly logger = new Logger(EmailQueueHandler.name)

  constructor(@Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider) {}

  async handle(jobs: Job<object>[]): Promise<EmailBatchResult> {
    const result: EmailBatchResult = { succeeded: [], failed: [] }

    for (const job of jobs) {
      const { to, subject, html, text } = job.data as EmailJobPayload
      try {
        await this.emailProvider.send({ to, subject, html, text })
        this.logger.log(`Email sent successfully to ${to} (job ${job.id})`)
        result.succeeded.push(job.id)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.logger.error(
          `Failed to send email to ${to} (job ${job.id})`,
          error instanceof Error ? error.stack : String(error)
        )
        result.failed.push({ jobId: job.id, error: errorMessage })
      }
    }

    return result
  }
}
