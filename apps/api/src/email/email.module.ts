import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EMAIL_PROVIDER } from './email.provider.js'
import { NodemailerEmailProvider } from './nodemailer.provider.js'
import { ResendEmailProvider } from './resend.provider.js'

@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        if (config.get('RESEND_API_KEY')) return new ResendEmailProvider(config)
        if (config.get('SMTP_HOST')) return new NodemailerEmailProvider(config)
        return new ResendEmailProvider(config) // console-log fallback
      },
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
