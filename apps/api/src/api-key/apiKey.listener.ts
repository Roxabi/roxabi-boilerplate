import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import {
  ORGANIZATION_SOFT_DELETED,
  type OrganizationSoftDeletedEvent,
} from '../common/events/organizationSoftDeleted.event.js'
import {
  USER_SOFT_DELETED,
  type UserSoftDeletedEvent,
} from '../common/events/userSoftDeleted.event.js'
import { ApiKeyService } from './apiKey.service.js'

@Injectable()
export class ApiKeyListener {
  private readonly logger = new Logger(ApiKeyListener.name)

  constructor(private readonly apiKeyService: ApiKeyService) {}

  @OnEvent(USER_SOFT_DELETED)
  async handleUserSoftDeleted(event: UserSoftDeletedEvent) {
    this.logger.log(`Revoking all API keys for soft-deleted user ${event.userId}`)
    await this.apiKeyService.revokeAllForUser(event.userId)
  }

  @OnEvent(ORGANIZATION_SOFT_DELETED)
  async handleOrgSoftDeleted(event: OrganizationSoftDeletedEvent) {
    this.logger.log(`Revoking all API keys for soft-deleted organization ${event.organizationId}`)
    await this.apiKeyService.revokeAllForOrg(event.organizationId)
  }
}
