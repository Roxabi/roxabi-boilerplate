import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { DELETION_GRACE_PERIOD_MS } from '../common/constants.js'
import {
  ORGANIZATION_SOFT_DELETED,
  OrganizationSoftDeletedEvent,
} from '../common/events/organizationSoftDeleted.event.js'
import { OrgNameConfirmationMismatchException } from './exceptions/orgNameConfirmationMismatch.exception.js'
import { OrgNotDeletedException } from './exceptions/orgNotDeleted.exception.js'
import { OrgNotFoundException } from './exceptions/orgNotFound.exception.js'
import { OrgNotOwnerException } from './exceptions/orgNotOwner.exception.js'
import { ORG_REPO, type OrgRepository } from './org.repository.js'

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(ORG_REPO) private readonly repo: OrgRepository,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async listForUser(userId: string) {
    return this.repo.listForUser(userId)
  }

  async softDelete(orgId: string, userId: string, confirmName: string) {
    const org = await this.repo.findActiveOrg(orgId)
    if (!org) throw new OrgNotFoundException(orgId)
    if (org.name.toLowerCase() !== confirmName.toLowerCase()) {
      throw new OrgNameConfirmationMismatchException()
    }

    const membership = await this.repo.checkOwnership(orgId, userId)
    if (!membership || membership.role !== 'owner') {
      throw new OrgNotOwnerException(orgId)
    }

    const now = new Date()
    const deleteScheduledFor = new Date(now.getTime() + DELETION_GRACE_PERIOD_MS)

    const updated = await this.repo.transaction(async (tx) => {
      const result = await this.repo.softDeleteOrg(orgId, now, deleteScheduledFor, tx)
      await this.repo.clearOrgSessions(orgId, tx)
      await this.repo.expireOrgInvitations(orgId, tx)
      return result
    })

    await this.eventEmitter.emitAsync(
      ORGANIZATION_SOFT_DELETED,
      new OrganizationSoftDeletedEvent(orgId)
    )

    return updated
  }

  async reactivate(orgId: string, userId: string) {
    const org = await this.repo.findOrgForReactivate(orgId)
    if (!org) throw new OrgNotFoundException(orgId)
    if (!org.deletedAt) throw new OrgNotDeletedException(orgId)

    const membership = await this.repo.checkOwnership(orgId, userId)
    if (!membership || membership.role !== 'owner') {
      throw new OrgNotOwnerException(orgId)
    }

    return this.repo.transaction(async (tx) => {
      return this.repo.reactivateOrg(orgId, new Date(), tx)
    })
  }

  async getDeletionImpact(orgId: string) {
    const org = await this.repo.findActiveOrg(orgId)
    if (!org) throw new OrgNotFoundException(orgId)
    return this.repo.getDeletionImpact(orgId)
  }
}
