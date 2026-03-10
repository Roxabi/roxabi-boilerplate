import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { ErrorCode } from '../common/errorCodes.js'
import { AuthGuard } from './auth.guard.js'

// ---------------------------------------------------------------------------
// Mock factories for API key path (#319)
// ---------------------------------------------------------------------------

function createMockApiKeyService(result: Record<string, unknown> | null = null, throws?: Error) {
  return {
    validateBearerToken: throws
      ? vi.fn().mockRejectedValue(throws)
      : vi.fn().mockResolvedValue(result),
    touchLastUsedAt: vi.fn(),
  }
}

function createMockPermissionService(permissions: string[] = []) {
  return {
    getPermissions: vi.fn().mockResolvedValue(permissions),
  }
}

function createMockAuthService(session: Record<string, unknown> | null = null) {
  return {
    getSession: vi.fn().mockResolvedValue(session),
  }
}

function createMockReflector(metadata: Record<string, unknown> = {}) {
  return {
    getAllAndOverride: vi.fn().mockImplementation((key: string) => metadata[key]),
  }
}

function createMockContext(request: Record<string, unknown> = {}) {
  const req = { method: 'GET', url: '/api/some/endpoint', ...request }

  const context = {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  }

  return { context, req }
}

function createMockUserService(
  deletedAt: Date | null = null,
  deleteScheduledFor: Date | null = null
) {
  return {
    getSoftDeleteStatus: vi.fn().mockResolvedValue({ deletedAt, deleteScheduledFor }),
  }
}

function createGuard(
  session: Record<string, unknown> | null = null,
  metadata: Record<string, unknown> = {},
  userService: Record<string, unknown> = createMockUserService(),
  apiKeyService?: Record<string, unknown>,
  permissionService?: Record<string, unknown>
) {
  const authService = createMockAuthService(session)
  const reflector = createMockReflector(metadata)
  const resolvedApiKeyService = apiKeyService ?? createMockApiKeyService()
  const resolvedPermissionService = permissionService ?? createMockPermissionService()
  const guard = new AuthGuard(
    authService as never,
    reflector as never,
    userService as never,
    resolvedApiKeyService as never,
    resolvedPermissionService as never
  )

  return {
    guard,
    authService,
    reflector,
    apiKeyService: resolvedApiKeyService,
    permissionService: resolvedPermissionService,
  }
}

describe('AuthGuard', () => {
  it('should return true when route is public', async () => {
    // Arrange
    const { guard } = createGuard(null, { PUBLIC: true })
    const { context } = createMockContext()

    // Act
    const result = await guard.canActivate(context as never)

    // Assert
    expect(result).toBe(true)
  })

  it('should return true when auth is optional and no session exists', async () => {
    // Arrange
    const { guard } = createGuard(null, { OPTIONAL_AUTH: true })
    const { context } = createMockContext()

    // Act
    const result = await guard.canActivate(context as never)

    // Assert
    expect(result).toBe(true)
  })

  it('should throw UnauthorizedException when no session on protected route', async () => {
    // Arrange
    const { guard } = createGuard(null)
    const { context } = createMockContext()

    // Act & Assert
    await expect(guard.canActivate(context as never)).rejects.toThrow(UnauthorizedException)
  })

  it('should set request.session and request.user when session is valid', async () => {
    // Arrange
    const session = {
      user: { id: 'user-1', name: 'Test', role: 'user' },
      session: { id: 'sess-1', activeOrganizationId: null },
      permissions: [],
    }
    const { guard } = createGuard(session)
    const { context, req } = createMockContext()

    // Act
    const result = await guard.canActivate(context as never)

    // Assert — session gets actorType: 'user' added by the guard (new object via spread)
    expect(result).toBe(true)
    expect((req as Record<string, unknown>).session).toMatchObject(session)
    expect(((req as Record<string, unknown>).session as Record<string, unknown>).actorType).toBe(
      'user'
    )
    expect((req as Record<string, unknown>).user).toBe(session.user)
  })

  it('should throw UnauthorizedException when session has no user', async () => {
    // Arrange
    const session = {
      session: { id: 'sess-1', activeOrganizationId: null },
    }
    const { guard } = createGuard(session)
    const { context } = createMockContext()

    // Act & Assert
    await expect(guard.canActivate(context as never)).rejects.toThrow(UnauthorizedException)
  })

  it('should throw ForbiddenException when role does not match', async () => {
    // Arrange
    const session = {
      user: { id: 'user-1', role: 'user' },
      session: { id: 'sess-1', activeOrganizationId: null },
      permissions: [],
    }
    const { guard } = createGuard(session, { ROLES: ['superadmin'] })
    const { context } = createMockContext()

    // Act & Assert
    await expect(guard.canActivate(context as never)).rejects.toThrow(ForbiddenException)
  })

  it('should return true when role matches required roles', async () => {
    // Arrange
    const session = {
      user: { id: 'user-1', role: 'superadmin' },
      session: { id: 'sess-1', activeOrganizationId: null },
      permissions: [],
    }
    const { guard } = createGuard(session, { ROLES: ['superadmin'] })
    const { context } = createMockContext()

    // Act
    const result = await guard.canActivate(context as never)

    // Assert
    expect(result).toBe(true)
  })

  it('should default to user role when user has no role property', async () => {
    // Arrange
    const session = {
      user: { id: 'user-1' },
      session: { id: 'sess-1', activeOrganizationId: null },
      permissions: [],
    }
    const { guard } = createGuard(session, { ROLES: ['user'] })
    const { context } = createMockContext()

    // Act
    const result = await guard.canActivate(context as never)

    // Assert
    expect(result).toBe(true)
  })

  it('should throw ForbiddenException with message when REQUIRE_ORG is set and no activeOrganizationId', async () => {
    // Arrange
    const session = {
      user: { id: 'user-1', role: 'user' },
      session: { id: 'sess-1', activeOrganizationId: null },
      permissions: [],
    }
    const { guard } = createGuard(session, { REQUIRE_ORG: true })
    const { context } = createMockContext()

    // Act & Assert
    await expect(guard.canActivate(context as never)).rejects.toThrow(
      new ForbiddenException('No active organization')
    )
  })

  it('should return true when REQUIRE_ORG is set and activeOrganizationId exists', async () => {
    // Arrange
    const session = {
      user: { id: 'user-1', role: 'user' },
      session: { id: 'sess-1', activeOrganizationId: 'org-1' },
      permissions: [],
    }
    const { guard } = createGuard(session, { REQUIRE_ORG: true })
    const { context } = createMockContext()

    // Act
    const result = await guard.canActivate(context as never)

    // Assert
    expect(result).toBe(true)
  })

  describe('PERMISSIONS check', () => {
    it('should throw ForbiddenException when no active org and permissions required', async () => {
      // Arrange
      const session = {
        user: { id: 'user-1', role: 'user' },
        session: { id: 'sess-1', activeOrganizationId: null },
        permissions: [],
      }
      const { guard } = createGuard(session, { PERMISSIONS: ['roles:read'] })
      const { context } = createMockContext()

      // Act & Assert
      await expect(guard.canActivate(context as never)).rejects.toThrow(ForbiddenException)
    })

    it('should bypass permission check for superadmin', async () => {
      // Arrange
      const session = {
        user: { id: 'user-1', role: 'superadmin' },
        session: { id: 'sess-1', activeOrganizationId: 'org-1' },
        permissions: [],
      }
      const { guard } = createGuard(session, {
        PERMISSIONS: ['roles:read'],
      })
      const { context } = createMockContext()

      // Act
      const result = await guard.canActivate(context as never)

      // Assert
      expect(result).toBe(true)
    })

    it('should allow when user has required permissions', async () => {
      // Arrange
      const session = {
        user: { id: 'user-1', role: 'user' },
        session: { id: 'sess-1', activeOrganizationId: 'org-1' },
        permissions: ['roles:read', 'members:read'],
      }
      const { guard } = createGuard(session, { PERMISSIONS: ['roles:read'] })
      const { context } = createMockContext()

      // Act
      const result = await guard.canActivate(context as never)

      // Assert
      expect(result).toBe(true)
    })

    it('should throw ForbiddenException when user lacks required permissions', async () => {
      // Arrange
      const session = {
        user: { id: 'user-1', role: 'user' },
        session: { id: 'sess-1', activeOrganizationId: 'org-1' },
        permissions: ['roles:read'],
      }
      const { guard } = createGuard(session, { PERMISSIONS: ['roles:write'] })
      const { context } = createMockContext()

      // Act & Assert
      await expect(guard.canActivate(context as never)).rejects.toThrow(
        new ForbiddenException('Insufficient permissions')
      )
    })

    it('should require all permissions when multiple are specified', async () => {
      // Arrange
      const session = {
        user: { id: 'user-1', role: 'user' },
        session: { id: 'sess-1', activeOrganizationId: 'org-1' },
        permissions: ['roles:read'],
      }
      const { guard } = createGuard(session, { PERMISSIONS: ['roles:read', 'members:write'] })
      const { context } = createMockContext()

      // Act & Assert
      await expect(guard.canActivate(context as never)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('checkSoftDeleted', () => {
    const validSession = {
      user: { id: 'user-1', role: 'user' },
      session: { id: 'sess-1', activeOrganizationId: null },
      permissions: [],
    }

    it('should allow active user (no deletedAt) to pass through', async () => {
      // Arrange
      const userService = createMockUserService(null, null)
      const { guard } = createGuard(validSession, {}, userService)
      const { context } = createMockContext({ method: 'GET', url: '/api/users/settings' })

      // Act
      const result = await guard.canActivate(context as never)

      // Assert
      expect(result).toBe(true)
    })

    it('should block soft-deleted user on normal endpoints', async () => {
      // Arrange
      const deleteDate = new Date('2026-03-01T00:00:00.000Z')
      const userService = createMockUserService(new Date(), deleteDate)
      const { guard } = createGuard(validSession, {}, userService)
      const { context } = createMockContext({ method: 'GET', url: '/api/users/settings' })

      // Act & Assert
      await expect(guard.canActivate(context as never)).rejects.toThrow(ForbiddenException)
    })

    it('should allow soft-deleted user to access POST /api/users/me/reactivate', async () => {
      // Arrange
      const userService = createMockUserService(new Date(), new Date('2026-03-01'))
      const { guard } = createGuard(validSession, {}, userService)
      const { context } = createMockContext({ method: 'POST', url: '/api/users/me/reactivate' })

      // Act
      const result = await guard.canActivate(context as never)

      // Assert
      expect(result).toBe(true)
    })

    it('should allow soft-deleted user to access GET /api/users/me', async () => {
      // Arrange
      const userService = createMockUserService(new Date(), new Date('2026-03-01'))
      const { guard } = createGuard(validSession, {}, userService)
      const { context } = createMockContext({ method: 'GET', url: '/api/users/me' })

      // Act
      const result = await guard.canActivate(context as never)

      // Assert
      expect(result).toBe(true)
    })

    it('should block soft-deleted user on non-POST to /api/users/me/reactivate', async () => {
      // Arrange
      const deleteDate = new Date('2026-03-01T00:00:00.000Z')
      const userService = createMockUserService(new Date(), deleteDate)
      const { guard } = createGuard(validSession, {}, userService)
      const { context } = createMockContext({ method: 'GET', url: '/api/users/me/reactivate' })

      // Act & Assert
      await expect(guard.canActivate(context as never)).rejects.toThrow(ForbiddenException)
    })

    it('should include deleteScheduledFor in error response', async () => {
      // Arrange
      const deleteDate = new Date('2026-03-01T00:00:00.000Z')
      const userService = createMockUserService(new Date(), deleteDate)
      const { guard } = createGuard(validSession, {}, userService)
      const { context } = createMockContext({ method: 'PATCH', url: '/api/users/me/profile' })

      // Act & Assert
      try {
        await guard.canActivate(context as never)
        expect.unreachable('Should have thrown ForbiddenException')
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException)
        const response = (error as ForbiddenException).getResponse() as Record<string, unknown>
        expect(response.message).toBe('Account is scheduled for deletion')
        expect(response.errorCode).toBe(ErrorCode.ACCOUNT_SCHEDULED_FOR_DELETION)
        expect(response.deleteScheduledFor).toBe('2026-03-01T00:00:00.000Z')
      }
    })

    it('should strip query string before matching allowed routes', async () => {
      // Arrange
      const userService = createMockUserService(new Date(), new Date('2026-03-01'))
      const { guard } = createGuard(validSession, {}, userService)
      const { context } = createMockContext({
        method: 'POST',
        url: '/api/users/me/reactivate?token=abc',
      })

      // Act
      const result = await guard.canActivate(context as never)

      // Assert
      expect(result).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // API key auth — RED phase tests (#319)
  // -----------------------------------------------------------------------
  describe('API key auth', () => {
    const VALID_API_KEY_TOKEN = 'sk_live_testkey'

    const validKeyData = {
      id: 'key-uuid-1',
      userId: 'user-uuid-1',
      tenantId: 'tenant-uuid-1',
      scopes: ['api:read'],
      role: 'user',
      revokedAt: null,
      expiresAt: null,
    }

    it('should call apiKeyService.validateBearerToken with the token and attach a synthetic session with actorType api_key', async () => {
      // Arrange
      const apiKeyService = createMockApiKeyService(validKeyData)
      const orgPermissions = ['api:read']
      const permissionService = createMockPermissionService(orgPermissions)
      const { guard, context } = (() => {
        const { guard } = createGuard(
          null,
          {},
          createMockUserService(),
          apiKeyService,
          permissionService
        )
        const { context } = createMockContext({
          headers: { authorization: `Bearer ${VALID_API_KEY_TOKEN}` },
        })
        return { guard, context }
      })()

      // Act
      const result = await guard.canActivate(context as never)

      // Assert
      expect(result).toBe(true)
      expect(apiKeyService.validateBearerToken).toHaveBeenCalledWith(VALID_API_KEY_TOKEN)
      const req = context.switchToHttp().getRequest() as Record<string, unknown>
      expect((req.session as Record<string, unknown>).actorType).toBe('api_key')
      expect((req.session as Record<string, unknown>).apiKeyId).toBe(validKeyData.id)
      // Permissions must equal the intersection of key scopes and org permissions
      const expectedPermissions = validKeyData.scopes.filter((s) => orgPermissions.includes(s))
      expect((req.session as Record<string, unknown>).permissions).toEqual(expectedPermissions)
    })

    it('should set session.permissions to intersection of key scopes and org permissions', async () => {
      // Arrange — key has more scopes than the org currently grants
      const keyData = { ...validKeyData, scopes: ['api:read', 'admin:write'] }
      const orgPermissions = ['api:read']
      const apiKeyService = createMockApiKeyService(keyData)
      const permissionService = createMockPermissionService(orgPermissions)
      const { guard } = createGuard(
        null,
        {},
        createMockUserService(),
        apiKeyService,
        permissionService
      )
      const { context } = createMockContext({
        headers: { authorization: `Bearer ${VALID_API_KEY_TOKEN}` },
      })

      // Act
      await guard.canActivate(context as never)

      // Assert — only the intersection survives
      const req = context.switchToHttp().getRequest() as Record<string, unknown>
      expect((req.session as Record<string, unknown>).permissions).toEqual(['api:read'])
    })

    it('should call touchLastUsedAt with the key id after successful validation', async () => {
      // Arrange
      const apiKeyService = createMockApiKeyService(validKeyData)
      const permissionService = createMockPermissionService(['api:read'])
      const { guard } = createGuard(
        null,
        {},
        createMockUserService(),
        apiKeyService,
        permissionService
      )
      const { context } = createMockContext({
        headers: { authorization: `Bearer ${VALID_API_KEY_TOKEN}` },
      })

      // Act
      await guard.canActivate(context as never)

      // Assert
      expect(apiKeyService.touchLastUsedAt).toHaveBeenCalledWith(validKeyData.id)
    })

    it('should NOT call checkSoftDeleted (userService.getSoftDeleteStatus) for API key auth', async () => {
      // Arrange
      const apiKeyService = createMockApiKeyService(validKeyData)
      const permissionService = createMockPermissionService(['api:read'])
      const userService = createMockUserService()
      const { guard } = createGuard(null, {}, userService, apiKeyService, permissionService)
      const { context } = createMockContext({
        headers: { authorization: `Bearer ${VALID_API_KEY_TOKEN}` },
      })

      // Act
      await guard.canActivate(context as never)

      // Assert
      expect(userService.getSoftDeleteStatus).not.toHaveBeenCalled()
    })

    it('should throw ForbiddenException with API_KEY_SCOPE_DENIED when route requires @Roles() but no @Permissions()', async () => {
      // Arrange — role-gated routes without @Permissions() are inaccessible to API key sessions
      const apiKeyService = createMockApiKeyService(validKeyData)
      const permissionService = createMockPermissionService(['api:read'])
      const { guard } = createGuard(
        null,
        { ROLES: ['admin'] },
        createMockUserService(),
        apiKeyService,
        permissionService
      )
      const { context } = createMockContext({
        headers: { authorization: `Bearer ${VALID_API_KEY_TOKEN}` },
      })

      // Act & Assert — throws because role-gated route has no @Permissions() declared
      await expect(guard.canActivate(context as never)).rejects.toMatchObject({
        response: { errorCode: ErrorCode.API_KEY_SCOPE_DENIED },
      })
    })

    it('should NOT throw ForbiddenException for api_key actorType when route requires @Roles() AND @Permissions() that key has', async () => {
      // Arrange — role-gated route also declares @Permissions(), API key has the required scope
      const apiKeyService = createMockApiKeyService(validKeyData)
      const permissionService = createMockPermissionService(['api:read'])
      const { guard } = createGuard(
        null,
        { ROLES: ['admin'], PERMISSIONS: ['api:read'] },
        createMockUserService(),
        apiKeyService,
        permissionService
      )
      const { context } = createMockContext({
        headers: { authorization: `Bearer ${VALID_API_KEY_TOKEN}` },
      })

      // Act & Assert — should pass because @Permissions() is also declared and key has the scope
      await expect(guard.canActivate(context as never)).resolves.toBe(true)
    })

    it('should throw ForbiddenException with API_KEY_SCOPE_DENIED when superadmin API key lacks required scope', async () => {
      // Arrange — superadmin user, but API key has no scopes → bypass suppressed → scope check fails
      const superadminKeyData = { ...validKeyData, role: 'superadmin', scopes: [] }
      const apiKeyService = createMockApiKeyService(superadminKeyData)
      const permissionService = createMockPermissionService([]) // no org permissions either
      const { guard } = createGuard(
        null,
        { PERMISSIONS: ['api:write'] },
        createMockUserService(),
        apiKeyService,
        permissionService
      )
      const { context } = createMockContext({
        headers: { authorization: `Bearer ${VALID_API_KEY_TOKEN}` },
      })

      // Act & Assert
      await expect(guard.canActivate(context as never)).rejects.toMatchObject({
        response: { errorCode: ErrorCode.API_KEY_SCOPE_DENIED },
      })
    })

    it('should throw UnauthorizedException with API_KEY_REQUIRED when @RequireApiKey() is set but auth is via session', async () => {
      // Arrange — session auth (no Bearer header), but route requires API key
      const sessionData = {
        user: { id: 'user-1', role: 'user' },
        session: { id: 'sess-1', activeOrganizationId: 'org-1' },
        permissions: [],
      }
      const { guard } = createGuard(sessionData, { REQUIRE_API_KEY: true })
      const { context } = createMockContext() // no Authorization header

      // Act & Assert
      await expect(guard.canActivate(context as never)).rejects.toMatchObject({
        response: { errorCode: ErrorCode.API_KEY_REQUIRED },
      })
    })

    it('should throw UnauthorizedException with API_KEY_REQUIRED even when @AllowAnonymous() (PUBLIC) is also set', async () => {
      // Arrange — @AllowAnonymous() sets PUBLIC=true, but @RequireApiKey() must take precedence
      const { guard } = createGuard(null, { REQUIRE_API_KEY: true, PUBLIC: true })
      const { context } = createMockContext() // no Authorization header

      // Act & Assert
      await expect(guard.canActivate(context as never)).rejects.toMatchObject({
        response: { errorCode: ErrorCode.API_KEY_REQUIRED },
      })
    })

    it('should fall through to session auth path when Bearer token does NOT start with sk_live_', async () => {
      // Arrange — non-api-key Bearer (e.g., a JWT) should skip validateBearerToken and use session auth
      const sessionData = {
        user: { id: 'user-1', role: 'user' },
        session: { id: 'sess-1', activeOrganizationId: null },
        permissions: [],
      }
      const apiKeyService = createMockApiKeyService(validKeyData)
      const permissionService = createMockPermissionService([])
      const { guard } = createGuard(
        sessionData,
        {},
        createMockUserService(),
        apiKeyService,
        permissionService
      )
      const { context } = createMockContext({
        headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.some.jwt' },
      })

      // Act
      const result = await guard.canActivate(context as never)

      // Assert — resolved via session path, NOT API key path
      expect(result).toBe(true)
      expect(apiKeyService.validateBearerToken).not.toHaveBeenCalled()
    })

    it('should rethrow as UnauthorizedException with API_KEY_UNAUTHORIZED when validateBearerToken throws ApiKeyInvalidException', async () => {
      // Arrange — all API key auth failures (invalid, revoked, expired) collapse to API_KEY_UNAUTHORIZED externally
      const { ApiKeyInvalidException: InvalidEx } = await import(
        '../api-key/exceptions/apiKeyInvalid.exception.js'
      )
      const invalidError = new InvalidEx()
      const apiKeyService = createMockApiKeyService(null, invalidError)
      const { guard } = createGuard(null, {}, createMockUserService(), apiKeyService)
      const { context } = createMockContext({
        headers: { authorization: `Bearer ${VALID_API_KEY_TOKEN}` },
      })

      // Act & Assert
      await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
        UnauthorizedException
      )
      await expect(guard.canActivate(context as never)).rejects.toMatchObject({
        response: { errorCode: ErrorCode.API_KEY_UNAUTHORIZED },
      })
    })

    it('should return true even if touchLastUsedAt throws', async () => {
      // Arrange
      const throwingApiKeyService = createMockApiKeyService(validKeyData)
      throwingApiKeyService.touchLastUsedAt = vi.fn().mockImplementation(() => {
        throw new Error('DB error')
      })
      const { guard } = createGuard(
        null,
        {},
        createMockUserService(),
        throwingApiKeyService,
        createMockPermissionService(['api:read'])
      )
      const { context } = createMockContext({
        headers: { authorization: `Bearer ${VALID_API_KEY_TOKEN}` },
      })

      // Act
      const result = await guard.canActivate(context as never)

      // Assert
      expect(result).toBe(true)
    })
  })
})
