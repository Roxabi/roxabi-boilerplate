import { Inject, Injectable } from '@nestjs/common'
import type { ConsentRecord } from '@repo/types'
import { CONSENT_REPO, type ConsentRepository, type SaveConsentDto } from './consent.repository.js'

export type { SaveConsentDto } from './consent.repository.js'

@Injectable()
export class ConsentService {
  constructor(@Inject(CONSENT_REPO) private readonly repo: ConsentRepository) {}

  async saveConsent(userId: string, dto: SaveConsentDto): Promise<ConsentRecord> {
    return this.repo.saveConsent(userId, dto)
  }

  async getLatestConsent(userId: string): Promise<ConsentRecord> {
    return this.repo.getLatestByUserId(userId)
  }
}
