import { Module } from '@nestjs/common'
import { EMAIL_PROVIDER } from './email.provider.js'
import { ResendEmailProvider } from './resend.provider.js'

@Module({
  providers: [{ provide: EMAIL_PROVIDER, useClass: ResendEmailProvider }],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
