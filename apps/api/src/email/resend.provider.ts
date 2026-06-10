import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'
import { toError } from '../common/utils/toError.js'
import type { EmailProvider } from './email.provider.js'
import { EmailSendException } from './emailSend.exception.js'

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name)
  private readonly from: string
  private readonly resendClient: Resend | null

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY')
    this.from = config.get<string>('EMAIL_FROM', 'noreply@yourdomain.com')
    this.resendClient = apiKey ? new Resend(apiKey) : null

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged to console')
    }
  }

  async send(params: { to: string; subject: string; html: string; text?: string }): Promise<void> {
    if (!this.resendClient) {
      this.logger.debug(`[Console Email] To: ${params.to} | Subject: ${params.subject}`)
      const urlMatch = params.text?.match(/https?:\/\/\S+/)
      if (urlMatch) {
        this.logger.log(`[Console Email] URL: ${urlMatch[0]}`)
      }
      return
    }

    try {
      await this.resendClient.emails.send({
        from: this.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      })
    } catch (error) {
      const cause = toError(error)

      const redactedTo = params.to.replace(/(?<=.{2}).+(?=@)/, '***')
      this.logger.error(
        `Failed to send email to ${redactedTo} (subject: "${params.subject}"): ${cause.message}`,
        cause.stack
      )

      throw new EmailSendException(params.to, cause)
    }
  }
}
