import { ForbiddenException, Injectable } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { ErrorCode } from '../../common/errorCodes.js'

export type DeletedOrgAllowedPattern = {
  method: string
  pattern: RegExp
}

// Default org-scoped routes that are allowed when org is soft-deleted
export const DEFAULT_DELETED_ORG_ALLOWED_PATTERNS: DeletedOrgAllowedPattern[] = [
  { method: 'POST', pattern: /^\/api\/organizations\/[^/]+\/reactivate$/ },
  { method: 'GET', pattern: /^\/api\/organizations\/[^/]+$/ },
]

type AuthenticatedRequest = FastifyRequest & {
  session?: {
    session: { activeOrganizationId?: string | null }
  } | null
}

@Injectable()
export class DeletedOrgRestrictionService {
  constructor(
    private readonly allowedPatterns: DeletedOrgAllowedPattern[] = DEFAULT_DELETED_ORG_ALLOWED_PATTERNS
  ) {}

  enforce(org: { deleteScheduledFor: Date | null }, request: AuthenticatedRequest): void {
    const method = request.method.toUpperCase()
    const path = request.url?.split('?')[0]

    const isAllowed = this.allowedPatterns.some(
      (route) => route.method === method && path && route.pattern.test(path)
    )

    if (!isAllowed) {
      throw new ForbiddenException({
        message: 'Organization is scheduled for deletion',
        errorCode: ErrorCode.ORG_SCHEDULED_FOR_DELETION,
        deleteScheduledFor: org.deleteScheduledFor?.toISOString(),
      })
    }
  }
}
