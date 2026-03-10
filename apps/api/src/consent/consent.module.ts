import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { AuthModule } from '../auth/auth.module.js'
import { ConsentController } from './consent.controller.js'
import { CONSENT_REPO } from './consent.repository.js'
import { ConsentService } from './consent.service.js'
import { ConsentExceptionFilter } from './filters/consentException.filter.js'
import { DrizzleConsentRepository } from './repositories/drizzleConsent.repository.js'

@Module({
  imports: [AuthModule],
  controllers: [ConsentController],
  providers: [
    ConsentService,
    { provide: CONSENT_REPO, useClass: DrizzleConsentRepository },
    { provide: APP_FILTER, useClass: ConsentExceptionFilter },
  ],
  exports: [ConsentService],
})
export class ConsentModule {}
