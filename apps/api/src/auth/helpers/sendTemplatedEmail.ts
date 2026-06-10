import { Logger } from '@nestjs/common'
import { APIError } from 'better-auth/api'
import { toError } from '../../common/utils/toError.js'
import { QUEUE_NAMES } from '../../queue/queue.constants.js'
import type { QueueEnqueuer } from '../../queue/queue.provider.js'

export type EmailContent = {
  html: string
  text?: string
  subject: string
}

export type EmailTemplateRenderer = () => Promise<EmailContent>

export async function renderEmailTemplate(
  renderFn: EmailTemplateRenderer,
  fallback: EmailContent,
  logger: Logger,
  warningMessage: string
): Promise<EmailContent> {
  try {
    return await renderFn()
  } catch (error) {
    logger.warn(warningMessage, { error: error instanceof Error ? error.message : String(error) })
    return fallback
  }
}

export async function sendTemplatedEmail(
  queueService: QueueEnqueuer,
  to: string,
  emailContent: EmailContent,
  logger: Logger,
  errorMessage: string,
  throwOnFailure = true
): Promise<void> {
  try {
    await queueService.enqueue(QUEUE_NAMES.EMAIL_SEND, { to, ...emailContent })
  } catch (error) {
    const cause = toError(error)
    logger.error(errorMessage, cause.stack)
    if (throwOnFailure) {
      throw new APIError('INTERNAL_SERVER_ERROR', { message: 'EMAIL_SEND_FAILED' })
    }
  }
}
