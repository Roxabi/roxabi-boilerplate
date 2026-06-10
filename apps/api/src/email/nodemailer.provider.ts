import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer from 'nodemailer'
import { toError } from '../common/utils/toError.js'
import type { EmailProvider } from './email.provider.js'
import { EmailSendException } from './emailSend.exception.js'

export class NodemailerEmailProvider implements EmailProvider {
  private readonly logger = new Logger(NodemailerEmailProvider.name)
  private readonly transporter: nodemailer.Transporter
  private readonly from: string

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST', 'localhost')
    const port = config.get<number>('SMTP_PORT', 1025)
    const secure = config.get<boolean>('SMTP_SECURE', false)
    this.from = config.get<string>('EMAIL_FROM', 'dev@localhost')
    // ignoreTLS: true — prevents STARTTLS upgrade even if the server advertises it.
    // Required for plain-text SMTP relays like Mailpit (port 1025) where STARTTLS
    // is either unsupported or causes SSL version mismatch errors.
    this.transporter = nodemailer.createTransport({ host, port, secure, ignoreTLS: !secure })
  }

  async send(params: { to: string; subject: string; html: string; text?: string }): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, ...params })
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
