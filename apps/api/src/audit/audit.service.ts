import { Inject, Injectable } from '@nestjs/common'
import { AUDIT_REPO, type AuditLogEntry, type AuditRepository } from './audit.repository.js'

export type { AuditLogEntry } from './audit.repository.js'

@Injectable()
export class AuditService {
  constructor(@Inject(AUDIT_REPO) private readonly repo: AuditRepository) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.repo.create(entry)
  }
}
