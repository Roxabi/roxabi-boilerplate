import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { GdprController } from './gdpr.controller.js'
import { GdprService } from './gdpr.service.js'
import {
  DrizzleGdprAnonymizationRepository,
  GDPR_ANONYMIZATION_REPO,
} from './repositories/gdprAnonymization.repository.js'
import {
  DrizzleGdprExportRepository,
  GDPR_EXPORT_REPO,
} from './repositories/gdprExport.repository.js'

@Module({
  imports: [AuthModule],
  controllers: [GdprController],
  providers: [
    GdprService,
    { provide: GDPR_EXPORT_REPO, useClass: DrizzleGdprExportRepository },
    { provide: GDPR_ANONYMIZATION_REPO, useClass: DrizzleGdprAnonymizationRepository },
  ],
  exports: [GdprService],
})
export class GdprModule {}
