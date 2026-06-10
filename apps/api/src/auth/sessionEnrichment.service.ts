import { Injectable } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { PermissionService } from '../rbac/permission.service.js'
import { AuthService } from './auth.service.js'

@Injectable()
export class SessionEnrichmentService {
  constructor(
    private readonly authService: AuthService,
    private readonly permissionService: PermissionService
  ) {}

  async getEnrichedSession(request: FastifyRequest) {
    const session = await this.authService.getRawSession(request)
    if (!session) return session

    const orgId = session.session?.activeOrganizationId
    let permissions: string[] = []

    if (orgId && session.user?.id) {
      permissions = await this.permissionService.getPermissions(session.user.id, orgId)
    }

    return { ...session, permissions }
  }
}
