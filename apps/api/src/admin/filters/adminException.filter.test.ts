import { HttpStatus } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { EmailConflictException } from '../exceptions/emailConflict.exception.js'
import { FeatureFlagCreateFailedException } from '../exceptions/featureFlagCreateFailed.exception.js'
import { FlagKeyConflictException } from '../exceptions/flagKeyConflict.exception.js'
import { FlagKeyInvalidException } from '../exceptions/flagKeyInvalid.exception.js'
import { FlagNotFoundException } from '../exceptions/flagNotFound.exception.js'
import { InvitationAlreadyPendingException } from '../exceptions/invitationAlreadyPending.exception.js'
import { InvitationNotFoundException } from '../exceptions/invitationNotFound.exception.js'
import { LastOwnerConstraintException } from '../exceptions/lastOwnerConstraint.exception.js'
import { MemberAlreadyExistsException } from '../exceptions/memberAlreadyExists.exception.js'
import { AdminMemberNotFoundException } from '../exceptions/memberNotFound.exception.js'
import { OrgCycleDetectedException } from '../exceptions/orgCycleDetected.exception.js'
import { OrgDepthExceededException } from '../exceptions/orgDepthExceeded.exception.js'
import { AdminOrgNotFoundException } from '../exceptions/orgNotFound.exception.js'
import { OrgSlugConflictException } from '../exceptions/orgSlugConflict.exception.js'
import { AdminRoleNotFoundException } from '../exceptions/roleNotFound.exception.js'
import { SelfActionException } from '../exceptions/selfAction.exception.js'
import { SelfRemovalException } from '../exceptions/selfRemoval.exception.js'
import { SelfRoleChangeException } from '../exceptions/selfRoleChange.exception.js'
import { UserAlreadyBannedException } from '../exceptions/userAlreadyBanned.exception.js'
import { AdminUserNotFoundException } from '../exceptions/userNotFound.exception.js'
import { AdminBadRequestFilter } from './adminBadRequest.filter.js'
import { AdminConflictFilter } from './adminConflict.filter.js'
import { AdminInternalErrorFilter } from './adminInternalError.filter.js'
import { AdminNotFoundFilter } from './adminNotFound.filter.js'

function createMockCls(id = 'test-correlation-id') {
  return { getId: vi.fn().mockReturnValue(id) }
}

function createMockHost(requestOverrides: Record<string, unknown> = {}) {
  const sendFn = vi.fn()
  const headerFn = vi.fn()
  const statusFn = vi.fn().mockReturnValue({ send: sendFn })

  const request = { url: '/admin/members', ...requestOverrides }
  const response = { status: statusFn, header: headerFn }

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  }

  const getSentBody = () => {
    const call = sendFn.mock.calls[0]
    expect(call).toBeDefined()
    return call?.[0] as Record<string, unknown>
  }

  return { host, statusFn, headerFn, getSentBody } as const
}

describe('AdminNotFoundFilter', () => {
  const cls = createMockCls()
  const filter = new AdminNotFoundFilter(cls as never)

  it('should return 404 for AdminMemberNotFoundException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new AdminMemberNotFoundException('m-123'), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
  })

  it('should return 404 for AdminRoleNotFoundException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new AdminRoleNotFoundException('r-456'), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
  })

  it('should return 404 for InvitationNotFoundException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new InvitationNotFoundException('inv-1'), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
  })

  it('should return 404 for AdminUserNotFoundException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new AdminUserNotFoundException('u-1'), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
  })

  it('should return 404 for AdminOrgNotFoundException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new AdminOrgNotFoundException('org-1'), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
  })

  it('should return 404 for FlagNotFoundException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new FlagNotFoundException('flag-1'), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
  })

  it('should include structured error body with statusCode, message, errorCode, path, correlationId, and timestamp', () => {
    const { host, getSentBody } = createMockHost({ url: '/admin/members/m-789' })
    filter.catch(new AdminMemberNotFoundException('m-789'), host as never)
    const body = getSentBody()
    expect(body.statusCode).toBe(404)
    expect(body.path).toBe('/admin/members/m-789')
    expect(body.correlationId).toBe('test-correlation-id')
    expect(body.message).toBe('Member "m-789" not found')
    expect(body.errorCode).toBe('ADMIN_MEMBER_NOT_FOUND')
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('should set x-correlation-id response header', () => {
    const { host, headerFn } = createMockHost()
    filter.catch(new AdminMemberNotFoundException('m-1'), host as never)
    expect(headerFn).toHaveBeenCalledWith('x-correlation-id', 'test-correlation-id')
  })

  it('should include correlationId from ClsService in response body', () => {
    const customCls = createMockCls('custom-corr-id')
    const customFilter = new AdminNotFoundFilter(customCls as never)
    const { host, getSentBody } = createMockHost()
    customFilter.catch(new AdminMemberNotFoundException('m-1'), host as never)
    const body = getSentBody()
    expect(body.correlationId).toBe('custom-corr-id')
    expect(customCls.getId).toHaveBeenCalled()
  })

  it('should include correct errorCode for each NOT_FOUND exception type', () => {
    const cases = [
      {
        exception: new AdminMemberNotFoundException('m-1'),
        expectedCode: 'ADMIN_MEMBER_NOT_FOUND',
      },
      { exception: new AdminRoleNotFoundException('r-1'), expectedCode: 'ADMIN_ROLE_NOT_FOUND' },
      { exception: new InvitationNotFoundException('inv-1'), expectedCode: 'INVITATION_NOT_FOUND' },
      { exception: new AdminUserNotFoundException('u-1'), expectedCode: 'ADMIN_USER_NOT_FOUND' },
      { exception: new AdminOrgNotFoundException('org-1'), expectedCode: 'ADMIN_ORG_NOT_FOUND' },
    ]

    for (const { exception, expectedCode } of cases) {
      const { host, getSentBody } = createMockHost()
      filter.catch(exception, host as never)
      expect(getSentBody().errorCode).toBe(expectedCode)
    }
  })
})

describe('AdminConflictFilter', () => {
  const cls = createMockCls()
  const filter = new AdminConflictFilter(cls as never)

  it('should return 409 for MemberAlreadyExistsException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new MemberAlreadyExistsException(), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.CONFLICT)
  })

  it('should return 409 for InvitationAlreadyPendingException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new InvitationAlreadyPendingException(), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.CONFLICT)
  })

  it('should return 409 for EmailConflictException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new EmailConflictException(), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.CONFLICT)
  })

  it('should return 409 for OrgSlugConflictException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new OrgSlugConflictException(), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.CONFLICT)
  })

  it('should return 409 for FlagKeyConflictException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new FlagKeyConflictException('my-flag'), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.CONFLICT)
  })

  it('should include structured error body', () => {
    const { host, getSentBody } = createMockHost({ url: '/admin/members' })
    filter.catch(new MemberAlreadyExistsException(), host as never)
    const body = getSentBody()
    expect(body.statusCode).toBe(409)
    expect(body.path).toBe('/admin/members')
    expect(body.correlationId).toBe('test-correlation-id')
    expect(body.errorCode).toBe('MEMBER_ALREADY_EXISTS')
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('should set x-correlation-id response header', () => {
    const { host, headerFn } = createMockHost()
    filter.catch(new MemberAlreadyExistsException(), host as never)
    expect(headerFn).toHaveBeenCalledWith('x-correlation-id', 'test-correlation-id')
  })

  it('should include correct errorCode for each CONFLICT exception type', () => {
    const cases = [
      { exception: new MemberAlreadyExistsException(), expectedCode: 'MEMBER_ALREADY_EXISTS' },
      {
        exception: new InvitationAlreadyPendingException(),
        expectedCode: 'INVITATION_ALREADY_PENDING',
      },
      { exception: new EmailConflictException(), expectedCode: 'EMAIL_CONFLICT' },
      { exception: new OrgSlugConflictException(), expectedCode: 'ADMIN_ORG_SLUG_CONFLICT' },
    ]

    for (const { exception, expectedCode } of cases) {
      const { host, getSentBody } = createMockHost()
      filter.catch(exception, host as never)
      expect(getSentBody().errorCode).toBe(expectedCode)
    }
  })
})

describe('AdminBadRequestFilter', () => {
  const cls = createMockCls()
  const filter = new AdminBadRequestFilter(cls as never)

  it('should return 400 for LastOwnerConstraintException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new LastOwnerConstraintException(), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
  })

  it('should return 400 for SelfRemovalException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new SelfRemovalException(), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
  })

  it('should return 400 for SelfRoleChangeException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new SelfRoleChangeException(), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
  })

  it('should return 400 for SelfActionException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new SelfActionException(), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
  })

  it('should return 400 for UserAlreadyBannedException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new UserAlreadyBannedException('u-1'), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
  })

  it('should return 400 for OrgDepthExceededException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new OrgDepthExceededException(), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
  })

  it('should return 400 for OrgCycleDetectedException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new OrgCycleDetectedException(), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
  })

  it('should return 400 for FlagKeyInvalidException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new FlagKeyInvalidException('bad key'), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
  })

  it('should include structured error body', () => {
    const { host, getSentBody } = createMockHost({ url: '/admin/members/m-1' })
    filter.catch(new LastOwnerConstraintException(), host as never)
    const body = getSentBody()
    expect(body.statusCode).toBe(400)
    expect(body.path).toBe('/admin/members/m-1')
    expect(body.correlationId).toBe('test-correlation-id')
    expect(body.errorCode).toBe('LAST_OWNER_CONSTRAINT')
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('should set x-correlation-id response header', () => {
    const { host, headerFn } = createMockHost()
    filter.catch(new LastOwnerConstraintException(), host as never)
    expect(headerFn).toHaveBeenCalledWith('x-correlation-id', 'test-correlation-id')
  })

  it('should include correlationId from ClsService in response body', () => {
    const customCls = createMockCls('custom-corr-id')
    const customFilter = new AdminBadRequestFilter(customCls as never)
    const { host, getSentBody } = createMockHost()
    customFilter.catch(new LastOwnerConstraintException(), host as never)
    const body = getSentBody()
    expect(body.correlationId).toBe('custom-corr-id')
    expect(customCls.getId).toHaveBeenCalled()
  })

  it('should include correct errorCode for each BAD_REQUEST exception type', () => {
    const cases = [
      { exception: new LastOwnerConstraintException(), expectedCode: 'LAST_OWNER_CONSTRAINT' },
      { exception: new SelfRemovalException(), expectedCode: 'SELF_REMOVAL' },
      { exception: new SelfRoleChangeException(), expectedCode: 'SELF_ROLE_CHANGE' },
      { exception: new SelfActionException(), expectedCode: 'SELF_ACTION' },
      { exception: new UserAlreadyBannedException('u-1'), expectedCode: 'USER_ALREADY_BANNED' },
      { exception: new OrgDepthExceededException(), expectedCode: 'ADMIN_ORG_DEPTH_EXCEEDED' },
      { exception: new OrgCycleDetectedException(), expectedCode: 'ADMIN_ORG_CYCLE_DETECTED' },
    ]

    for (const { exception, expectedCode } of cases) {
      const { host, getSentBody } = createMockHost()
      filter.catch(exception, host as never)
      expect(getSentBody().errorCode).toBe(expectedCode)
    }
  })
})

describe('AdminInternalErrorFilter', () => {
  const cls = createMockCls()
  const filter = new AdminInternalErrorFilter(cls as never)

  it('should return 500 for FeatureFlagCreateFailedException', () => {
    const { host, statusFn } = createMockHost()
    filter.catch(new FeatureFlagCreateFailedException(), host as never)
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
  })

  it('should mask the exception message for 500 errors', () => {
    const { host, getSentBody } = createMockHost()
    filter.catch(new FeatureFlagCreateFailedException(), host as never)
    const body = getSentBody()
    expect(body.message).toBe('An internal error occurred')
    expect(body.statusCode).toBe(500)
  })

  it('should include structured error body with errorCode, path, correlationId, and timestamp', () => {
    const { host, getSentBody } = createMockHost({ url: '/admin/feature-flags' })
    filter.catch(new FeatureFlagCreateFailedException(), host as never)
    const body = getSentBody()
    expect(body.statusCode).toBe(500)
    expect(body.path).toBe('/admin/feature-flags')
    expect(body.correlationId).toBe('test-correlation-id')
    expect(body.errorCode).toBe('FEATURE_FLAG_CREATE_FAILED')
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('should set x-correlation-id response header', () => {
    const { host, headerFn } = createMockHost()
    filter.catch(new FeatureFlagCreateFailedException(), host as never)
    expect(headerFn).toHaveBeenCalledWith('x-correlation-id', 'test-correlation-id')
  })
})
