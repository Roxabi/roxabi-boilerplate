import { ForbiddenException } from '@nestjs/common'
import { lastValueFrom, of } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorCode } from '../common/errorCodes.js'
import { TenantResolutionException } from './exceptions/tenantResolution.exception.js'
import {
  DEFAULT_DELETED_ORG_ALLOWED_PATTERNS,
  DeletedOrgRestrictionService,
} from './services/deletedOrgRestriction.service.js'
import { TenantInterceptor } from './tenant.interceptor.js'

function createMockCls(store: Record<string, unknown> = {}) {
  return {
    set: vi.fn((key: string, value: unknown) => {
      store[key] = value
    }),
    get: vi.fn((key: string) => store[key]),
  }
}

function createMockContext(session: Record<string, unknown> | null = null) {
  const request = { session, method: 'GET', url: '/api/some/endpoint' }
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: vi.fn(),
    getClass: vi.fn(),
  }
}

function createMockContextWithRoute(activeOrganizationId: string, method: string, url: string) {
  const request = {
    session: { session: { activeOrganizationId } },
    method,
    url,
  }
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: vi.fn(),
    getClass: vi.fn(),
  }
}

function createMockCallHandler(returnValue = 'handler-result') {
  const handle = vi.fn().mockReturnValue(of(returnValue))
  return { handle }
}

function createMockReflector(skipOrg = false) {
  return {
    getAllAndOverride: vi.fn().mockReturnValue(skipOrg),
  }
}

function createMockTenantRepo(rows: Record<string, unknown>[] = []) {
  return {
    lookupOrganization: vi.fn().mockImplementation((id: string) => {
      const row = rows.find((r) => r.id === id)
      return Promise.resolve(row ?? null)
    }),
  }
}

function createDeletedOrgService() {
  return new DeletedOrgRestrictionService(DEFAULT_DELETED_ORG_ALLOWED_PATTERNS)
}

describe('TenantInterceptor', () => {
  let store: Record<string, unknown>

  beforeEach(() => {
    store = {}
  })

  it('should set tenantId to null when no session exists', async () => {
    // Arrange
    const cls = createMockCls(store)
    const interceptor = new TenantInterceptor(
      cls as never,
      createMockReflector() as never,
      null as never,
      createDeletedOrgService()
    )
    const context = createMockContext(null)
    const next = createMockCallHandler()

    // Act
    const result$ = interceptor.intercept(context as never, next as never)
    await lastValueFrom(result$)

    // Assert
    expect(cls.set).toHaveBeenCalledWith('tenantId', null)
  })

  it('should set tenantId to null when activeOrganizationId is null', async () => {
    // Arrange
    const cls = createMockCls(store)
    const interceptor = new TenantInterceptor(
      cls as never,
      createMockReflector() as never,
      null as never,
      createDeletedOrgService()
    )
    const context = createMockContext({
      session: { activeOrganizationId: null },
    })
    const next = createMockCallHandler()

    // Act
    const result$ = interceptor.intercept(context as never, next as never)
    await lastValueFrom(result$)

    // Assert
    expect(cls.set).toHaveBeenCalledWith('tenantId', null)
  })

  it('should throw TenantResolutionException when tenantRepo throws', async () => {
    // Arrange
    const cls = createMockCls(store)
    const tenantRepo = {
      lookupOrganization: vi.fn().mockRejectedValue(new Error('DB connection lost')),
    }
    const interceptor = new TenantInterceptor(
      cls as never,
      createMockReflector() as never,
      tenantRepo as never,
      createDeletedOrgService()
    )
    const context = createMockContext({
      session: { activeOrganizationId: 'org-1' },
    })
    const next = createMockCallHandler()

    // Act & Assert
    const result$ = interceptor.intercept(context as never, next as never)
    await expect(lastValueFrom(result$)).rejects.toThrow(TenantResolutionException)
  })

  it('should call next.handle() to continue the request pipeline', async () => {
    // Arrange
    const cls = createMockCls(store)
    const rows = [{ id: 'org-1', name: 'Root Org' }]
    const tenantRepo = createMockTenantRepo(rows)
    const interceptor = new TenantInterceptor(
      cls as never,
      createMockReflector() as never,
      tenantRepo as never,
      createDeletedOrgService()
    )
    const context = createMockContext({
      session: { activeOrganizationId: 'org-1' },
    })
    const next = createMockCallHandler()

    // Act
    const result$ = interceptor.intercept(context as never, next as never)
    await lastValueFrom(result$)

    // Assert
    expect(next.handle).toHaveBeenCalled()
  })

  it('should skip org resolution and call next.handle() when @SkipOrg() is set', async () => {
    // Arrange
    const cls = createMockCls(store)
    const reflector = createMockReflector(true)
    const interceptor = new TenantInterceptor(
      cls as never,
      reflector as never,
      null as never,
      createDeletedOrgService()
    )
    const context = createMockContext({
      session: { activeOrganizationId: 'org-1' },
    })
    const next = createMockCallHandler()

    // Act
    const result$ = interceptor.intercept(context as never, next as never)
    const result = await lastValueFrom(result$)

    // Assert
    expect(result).toBe('handler-result')
    expect(next.handle).toHaveBeenCalled()
    expect(cls.set).not.toHaveBeenCalled()
  })

  describe('parent org resolution', () => {
    it('should use org ID as tenantId when org has no parent', async () => {
      // Arrange
      const cls = createMockCls(store)
      const rows = [{ id: 'org-1', name: 'Root Org' }]
      const tenantRepo = createMockTenantRepo(rows)
      const interceptor = new TenantInterceptor(
        cls as never,
        createMockReflector() as never,
        tenantRepo as never,
        createDeletedOrgService()
      )
      const context = createMockContext({
        session: { activeOrganizationId: 'org-1' },
      })
      const next = createMockCallHandler()

      // Act
      const result$ = interceptor.intercept(context as never, next as never)
      await lastValueFrom(result$)

      // Assert
      expect(cls.set).toHaveBeenCalledWith('tenantId', 'org-1')
    })

    it('should use org ID directly even when org has a parent (parent resolution deferred to Phase 3)', async () => {
      // Arrange — parentOrganizationId is present but resolution is disabled (TODO in interceptor)
      const cls = createMockCls(store)
      const rows = [{ id: 'child-org', name: 'Child Org', parentOrganizationId: 'parent-org' }]
      const tenantRepo = createMockTenantRepo(rows)
      const interceptor = new TenantInterceptor(
        cls as never,
        createMockReflector() as never,
        tenantRepo as never,
        createDeletedOrgService()
      )
      const context = createMockContext({
        session: { activeOrganizationId: 'child-org' },
      })
      const next = createMockCallHandler()

      // Act
      const result$ = interceptor.intercept(context as never, next as never)
      await lastValueFrom(result$)

      // Assert — returns orgId directly; parent resolution is deferred to Phase 3
      expect(cls.set).toHaveBeenCalledWith('tenantId', 'child-org')
    })

    it('should fall back to activeOrganizationId when org is not found in DB', async () => {
      // Arrange
      const cls = createMockCls(store)
      const tenantRepo = createMockTenantRepo([])
      const interceptor = new TenantInterceptor(
        cls as never,
        createMockReflector() as never,
        tenantRepo as never,
        createDeletedOrgService()
      )
      const context = createMockContext({
        session: { activeOrganizationId: 'missing-org' },
      })
      const next = createMockCallHandler()

      // Act
      const result$ = interceptor.intercept(context as never, next as never)
      await lastValueFrom(result$)

      // Assert
      expect(cls.set).toHaveBeenCalledWith('tenantId', 'missing-org')
    })

    it('should throw TenantResolutionException on DB error', async () => {
      // Arrange
      const cls = createMockCls(store)
      const tenantRepo = {
        lookupOrganization: vi.fn().mockRejectedValue(new Error('DB connection lost')),
      }
      const interceptor = new TenantInterceptor(
        cls as never,
        createMockReflector() as never,
        tenantRepo as never,
        createDeletedOrgService()
      )
      const context = createMockContext({
        session: { activeOrganizationId: 'org-1' },
      })
      const next = createMockCallHandler()

      // Act & Assert
      const result$ = interceptor.intercept(context as never, next as never)
      await expect(lastValueFrom(result$)).rejects.toThrow(TenantResolutionException)
    })

    it('should cache resolved tenant ID in CLS and reuse it', async () => {
      // Arrange
      const cls = createMockCls(store)
      const rows = [{ id: 'org-1', name: 'Root Org' }]
      const tenantRepo = createMockTenantRepo(rows)
      const interceptor = new TenantInterceptor(
        cls as never,
        createMockReflector() as never,
        tenantRepo as never,
        createDeletedOrgService()
      )
      const context = createMockContext({
        session: { activeOrganizationId: 'org-1' },
      })
      const next = createMockCallHandler()

      // Act - first call triggers DB lookup
      const result1$ = interceptor.intercept(context as never, next as never)
      await lastValueFrom(result1$)

      // Act - second call should use the cached value
      const result2$ = interceptor.intercept(context as never, next as never)
      await lastValueFrom(result2$)

      // Assert - tenant repo lookup should have been called only once
      expect(tenantRepo.lookupOrganization).toHaveBeenCalledTimes(1)
      // tenantId should be set twice (once per intercept call)
      const allCalls = (cls.set as ReturnType<typeof vi.fn>).mock.calls as unknown[][]
      const tenantIdCalls = allCalls.filter((call) => call[0] === 'tenantId')
      expect(tenantIdCalls).toHaveLength(2)
      expect(tenantIdCalls[0]?.[1]).toBe('org-1')
      expect(tenantIdCalls[1]?.[1]).toBe('org-1')
    })

    it('should treat null parentOrganizationId as root org', async () => {
      // Arrange
      const cls = createMockCls(store)
      const rows = [{ id: 'org-1', name: 'Root Org', parentOrganizationId: null }]
      const tenantRepo = createMockTenantRepo(rows)
      const interceptor = new TenantInterceptor(
        cls as never,
        createMockReflector() as never,
        tenantRepo as never,
        createDeletedOrgService()
      )
      const context = createMockContext({
        session: { activeOrganizationId: 'org-1' },
      })
      const next = createMockCallHandler()

      // Act
      const result$ = interceptor.intercept(context as never, next as never)
      await lastValueFrom(result$)

      // Assert
      expect(cls.set).toHaveBeenCalledWith('tenantId', 'org-1')
    })
  })

  describe('soft-delete blocking', () => {
    function createActiveOrgRow(id = 'org-1') {
      return { id, name: 'Test Org', deletedAt: null, deleteScheduledFor: null }
    }

    function createDeletedOrgRow(id = 'org-1') {
      return {
        id,
        name: 'Test Org',
        deletedAt: new Date('2026-02-15'),
        deleteScheduledFor: new Date('2026-03-01T00:00:00.000Z'),
      }
    }

    it('should allow active org to pass through normally', async () => {
      // Arrange
      const cls = createMockCls(store)
      const rows = [createActiveOrgRow()]
      const tenantRepo = createMockTenantRepo(rows)
      const interceptor = new TenantInterceptor(
        cls as never,
        createMockReflector() as never,
        tenantRepo as never,
        createDeletedOrgService()
      )
      const context = createMockContextWithRoute(
        'org-1',
        'PATCH',
        '/api/organizations/org-1/settings'
      )
      const next = createMockCallHandler()

      // Act
      const result$ = interceptor.intercept(context as never, next as never)
      const result = await lastValueFrom(result$)

      // Assert
      expect(result).toBe('handler-result')
      expect(next.handle).toHaveBeenCalled()
    })

    it('should block soft-deleted org on regular operations', async () => {
      // Arrange
      const cls = createMockCls(store)
      const rows = [createDeletedOrgRow()]
      const tenantRepo = createMockTenantRepo(rows)
      const interceptor = new TenantInterceptor(
        cls as never,
        createMockReflector() as never,
        tenantRepo as never,
        createDeletedOrgService()
      )
      const context = createMockContextWithRoute(
        'org-1',
        'PATCH',
        '/api/organizations/org-1/settings'
      )
      const next = createMockCallHandler()

      // Act & Assert
      const result$ = interceptor.intercept(context as never, next as never)
      await expect(lastValueFrom(result$)).rejects.toThrow(ForbiddenException)
    })

    it('should allow soft-deleted org POST to reactivate endpoint', async () => {
      // Arrange
      const cls = createMockCls(store)
      const rows = [createDeletedOrgRow()]
      const tenantRepo = createMockTenantRepo(rows)
      const interceptor = new TenantInterceptor(
        cls as never,
        createMockReflector() as never,
        tenantRepo as never,
        createDeletedOrgService()
      )
      const context = createMockContextWithRoute(
        'org-1',
        'POST',
        '/api/organizations/org-1/reactivate'
      )
      const next = createMockCallHandler()

      // Act
      const result$ = interceptor.intercept(context as never, next as never)
      const result = await lastValueFrom(result$)

      // Assert
      expect(result).toBe('handler-result')
    })

    it('should allow soft-deleted org GET to org detail endpoint', async () => {
      // Arrange
      const cls = createMockCls(store)
      const rows = [createDeletedOrgRow()]
      const tenantRepo = createMockTenantRepo(rows)
      const interceptor = new TenantInterceptor(
        cls as never,
        createMockReflector() as never,
        tenantRepo as never,
        createDeletedOrgService()
      )
      const context = createMockContextWithRoute('org-1', 'GET', '/api/organizations/org-1')
      const next = createMockCallHandler()

      // Act
      const result$ = interceptor.intercept(context as never, next as never)
      const result = await lastValueFrom(result$)

      // Assert
      expect(result).toBe('handler-result')
    })

    it('should block non-POST method to reactivate endpoint', async () => {
      // Arrange
      const cls = createMockCls(store)
      const rows = [createDeletedOrgRow()]
      const tenantRepo = createMockTenantRepo(rows)
      const interceptor = new TenantInterceptor(
        cls as never,
        createMockReflector() as never,
        tenantRepo as never,
        createDeletedOrgService()
      )
      const context = createMockContextWithRoute(
        'org-1',
        'GET',
        '/api/organizations/org-1/reactivate'
      )
      const next = createMockCallHandler()

      // Act & Assert
      const result$ = interceptor.intercept(context as never, next as never)
      await expect(lastValueFrom(result$)).rejects.toThrow(ForbiddenException)
    })

    it('should include deleteScheduledFor and errorCode in error response', async () => {
      // Arrange
      const cls = createMockCls(store)
      const rows = [createDeletedOrgRow()]
      const tenantRepo = createMockTenantRepo(rows)
      const interceptor = new TenantInterceptor(
        cls as never,
        createMockReflector() as never,
        tenantRepo as never,
        createDeletedOrgService()
      )
      const context = createMockContextWithRoute(
        'org-1',
        'DELETE',
        '/api/organizations/org-1/members/m-1'
      )
      const next = createMockCallHandler()

      // Act & Assert
      try {
        const result$ = interceptor.intercept(context as never, next as never)
        await lastValueFrom(result$)
        expect.unreachable('Should have thrown ForbiddenException')
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException)
        const response = (error as ForbiddenException).getResponse() as Record<string, unknown>
        expect(response.message).toBe('Organization is scheduled for deletion')
        expect(response.errorCode).toBe(ErrorCode.ORG_SCHEDULED_FOR_DELETION)
        expect(response.deleteScheduledFor).toBe('2026-03-01T00:00:00.000Z')
      }
    })
  })
})
