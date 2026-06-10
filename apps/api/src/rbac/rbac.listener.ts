import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { and, eq } from 'drizzle-orm'
import {
  ORGANIZATION_CREATED,
  OrganizationCreatedEvent,
} from '../common/events/organizationCreated.event.js'
import { members } from '../database/schema/auth.schema.js'
import { roles } from '../database/schema/rbac.schema.js'
import { TenantService } from '../tenant/tenant.service.js'
import { RbacService } from './rbac.service.js'

@Injectable()
export class RbacListener {
  private readonly logger = new Logger(RbacListener.name)

  constructor(
    private readonly rbacService: RbacService,
    private readonly tenantService: TenantService
  ) {}

  @OnEvent(ORGANIZATION_CREATED)
  async handleOrganizationCreated(event: OrganizationCreatedEvent) {
    this.logger.log(`Seeding default roles for organization ${event.organizationId}`)

    // Merge role seeding + owner assignment into a single transaction
    await this.tenantService.queryAs(event.organizationId, async (tx) => {
      await this.rbacService.seedDefaultRoles(event.organizationId, tx)

      const [ownerRole] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.tenantId, event.organizationId), eq(roles.slug, 'owner')))
        .limit(1)

      if (ownerRole) {
        await tx
          .update(members)
          .set({ roleId: ownerRole.id })
          .where(
            and(
              eq(members.userId, event.creatorUserId),
              eq(members.organizationId, event.organizationId)
            )
          )
      }
    })

    this.logger.log(`Default roles seeded for organization ${event.organizationId}`)
  }
}
