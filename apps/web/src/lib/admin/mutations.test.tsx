import { describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mock state — must be created before any module imports
// ---------------------------------------------------------------------------

const { mockMutate, mutationCalls } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mutationCalls: [] as Array<Record<string, unknown>>,
}))

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn().mockImplementation((options: Record<string, unknown>) => {
    mutationCalls.push(options)
    return { mutate: mockMutate, isPending: false }
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('./api', () => ({
  deleteAdminOrganization: vi.fn().mockResolvedValue(undefined),
  restoreAdminOrganization: vi.fn().mockResolvedValue(undefined),
  deleteAdminUser: vi.fn().mockResolvedValue(undefined),
  restoreAdminUser: vi.fn().mockResolvedValue(undefined),
  banAdminUser: vi.fn().mockResolvedValue(undefined),
  unbanAdminUser: vi.fn().mockResolvedValue(undefined),
}))

// ---------------------------------------------------------------------------
// Target imports — after mocks
// ---------------------------------------------------------------------------

import { toast } from 'sonner'
import * as api from './api'
import { useOrgMutations, useUserMutations } from './mutations'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function callHookDirectly<T>(fn: () => T): T {
  mutationCalls.length = 0
  return fn()
}

// ---------------------------------------------------------------------------
// useOrgMutations
// ---------------------------------------------------------------------------

describe('useOrgMutations', () => {
  it('returns deleteMutation and restoreMutation', () => {
    callHookDirectly(() => {})
    const result = useOrgMutations('org-1', 'Acme', vi.fn())
    expect(result).toHaveProperty('deleteMutation')
    expect(result).toHaveProperty('restoreMutation')
  })

  describe('deleteMutation', () => {
    it('mutationFn calls deleteAdminOrganization with orgId', async () => {
      mutationCalls.length = 0
      useOrgMutations('org-abc', 'Acme Corp', vi.fn())
      // deleteMutation is registered first
      const deleteOptions = mutationCalls[0] as { mutationFn: () => Promise<unknown> }
      await deleteOptions.mutationFn()
      expect(api.deleteAdminOrganization).toHaveBeenCalledWith('org-abc')
    })

    it('onSuccess calls toast.success with orgName + archived and calls onActionComplete', () => {
      mutationCalls.length = 0
      const onActionComplete = vi.fn()
      useOrgMutations('org-1', 'My Org', onActionComplete)
      const deleteOptions = mutationCalls[0] as { onSuccess: () => void }
      deleteOptions.onSuccess()
      expect(toast.success).toHaveBeenCalledWith('My Org has been archived')
      expect(onActionComplete).toHaveBeenCalledOnce()
    })

    it('onError calls toast.error with error message', () => {
      mutationCalls.length = 0
      useOrgMutations('org-1', 'My Org', vi.fn())
      const deleteOptions = mutationCalls[0] as { onError: (err: unknown) => void }
      deleteOptions.onError(new Error('Something broke'))
      expect(toast.error).toHaveBeenCalledWith('Something broke')
    })

    it('onError falls back to default message for non-Error objects', () => {
      mutationCalls.length = 0
      useOrgMutations('org-1', 'My Org', vi.fn())
      const deleteOptions = mutationCalls[0] as { onError: (err: unknown) => void }
      deleteOptions.onError('unexpected string error')
      expect(toast.error).toHaveBeenCalledWith('Failed to delete organization')
    })
  })

  describe('restoreMutation', () => {
    it('mutationFn calls restoreAdminOrganization with orgId', async () => {
      mutationCalls.length = 0
      useOrgMutations('org-xyz', 'Restored Org', vi.fn())
      const restoreOptions = mutationCalls[1] as { mutationFn: () => Promise<unknown> }
      await restoreOptions.mutationFn()
      expect(api.restoreAdminOrganization).toHaveBeenCalledWith('org-xyz')
    })

    it('onSuccess calls toast.success with orgName + restored and calls onActionComplete', () => {
      mutationCalls.length = 0
      const onActionComplete = vi.fn()
      useOrgMutations('org-1', 'My Org', onActionComplete)
      const restoreOptions = mutationCalls[1] as { onSuccess: () => void }
      restoreOptions.onSuccess()
      expect(toast.success).toHaveBeenCalledWith('My Org has been restored')
      expect(onActionComplete).toHaveBeenCalledOnce()
    })

    it('onError calls toast.error with error message', () => {
      mutationCalls.length = 0
      useOrgMutations('org-1', 'My Org', vi.fn())
      const restoreOptions = mutationCalls[1] as { onError: (err: unknown) => void }
      restoreOptions.onError(new Error('Restore failed'))
      expect(toast.error).toHaveBeenCalledWith('Restore failed')
    })

    it('onError falls back to default message for non-Error objects', () => {
      mutationCalls.length = 0
      useOrgMutations('org-1', 'My Org', vi.fn())
      const restoreOptions = mutationCalls[1] as { onError: (err: unknown) => void }
      restoreOptions.onError(null)
      expect(toast.error).toHaveBeenCalledWith('Failed to restore organization')
    })
  })
})

// ---------------------------------------------------------------------------
// useUserMutations
// ---------------------------------------------------------------------------

describe('useUserMutations', () => {
  it('returns banMutation, unbanMutation, deleteMutation, restoreMutation', () => {
    const result = useUserMutations('user-1', 'Alice', vi.fn())
    expect(result).toHaveProperty('banMutation')
    expect(result).toHaveProperty('unbanMutation')
    expect(result).toHaveProperty('deleteMutation')
    expect(result).toHaveProperty('restoreMutation')
  })

  describe('banMutation', () => {
    it('mutationFn calls banAdminUser with userId, reason, expires', async () => {
      mutationCalls.length = 0
      useUserMutations('user-99', 'Bob', vi.fn())
      // ban is first mutation registered
      const banOptions = mutationCalls[0] as {
        mutationFn: (args: { reason: string; expires?: string }) => Promise<unknown>
      }
      await banOptions.mutationFn({ reason: 'Spam', expires: '2027-12-31' })
      expect(api.banAdminUser).toHaveBeenCalledWith('user-99', 'Spam', '2027-12-31')
    })

    it('mutationFn calls banAdminUser without expires when not provided', async () => {
      mutationCalls.length = 0
      useUserMutations('user-5', 'Bob', vi.fn())
      const banOptions = mutationCalls[0] as {
        mutationFn: (args: { reason: string; expires?: string }) => Promise<unknown>
      }
      await banOptions.mutationFn({ reason: 'Abuse' })
      expect(api.banAdminUser).toHaveBeenCalledWith('user-5', 'Abuse', undefined)
    })

    it('onSuccess calls toast.success with userName + banned and calls onActionComplete', () => {
      mutationCalls.length = 0
      const onActionComplete = vi.fn()
      useUserMutations('user-1', 'Alice', onActionComplete)
      const banOptions = mutationCalls[0] as { onSuccess: () => void }
      banOptions.onSuccess()
      expect(toast.success).toHaveBeenCalledWith('Alice has been banned')
      expect(onActionComplete).toHaveBeenCalledOnce()
    })

    it('onError calls toast.error with error message', () => {
      mutationCalls.length = 0
      useUserMutations('user-1', 'Alice', vi.fn())
      const banOptions = mutationCalls[0] as { onError: (err: unknown) => void }
      banOptions.onError(new Error('Ban error'))
      expect(toast.error).toHaveBeenCalledWith('Ban error')
    })

    it('onError falls back to default message', () => {
      mutationCalls.length = 0
      useUserMutations('user-1', 'Alice', vi.fn())
      const banOptions = mutationCalls[0] as { onError: (err: unknown) => void }
      banOptions.onError(undefined)
      expect(toast.error).toHaveBeenCalledWith('Failed to ban user')
    })
  })

  describe('unbanMutation', () => {
    it('mutationFn calls unbanAdminUser with userId', async () => {
      mutationCalls.length = 0
      useUserMutations('user-7', 'Charlie', vi.fn())
      const unbanOptions = mutationCalls[1] as { mutationFn: () => Promise<unknown> }
      await unbanOptions.mutationFn()
      expect(api.unbanAdminUser).toHaveBeenCalledWith('user-7')
    })

    it('onSuccess calls toast.success with userName + unbanned', () => {
      mutationCalls.length = 0
      const onActionComplete = vi.fn()
      useUserMutations('user-1', 'Charlie', onActionComplete)
      const unbanOptions = mutationCalls[1] as { onSuccess: () => void }
      unbanOptions.onSuccess()
      expect(toast.success).toHaveBeenCalledWith('Charlie has been unbanned')
      expect(onActionComplete).toHaveBeenCalledOnce()
    })

    it('onError falls back to default message', () => {
      mutationCalls.length = 0
      useUserMutations('user-1', 'Charlie', vi.fn())
      const unbanOptions = mutationCalls[1] as { onError: (err: unknown) => void }
      unbanOptions.onError({})
      expect(toast.error).toHaveBeenCalledWith('Failed to unban user')
    })
  })

  describe('deleteMutation', () => {
    it('mutationFn calls deleteAdminUser with userId', async () => {
      mutationCalls.length = 0
      useUserMutations('user-11', 'Dave', vi.fn())
      const deleteOptions = mutationCalls[2] as { mutationFn: () => Promise<unknown> }
      await deleteOptions.mutationFn()
      expect(api.deleteAdminUser).toHaveBeenCalledWith('user-11')
    })

    it('onSuccess calls toast.success with userName + deleted', () => {
      mutationCalls.length = 0
      const onActionComplete = vi.fn()
      useUserMutations('user-1', 'Dave', onActionComplete)
      const deleteOptions = mutationCalls[2] as { onSuccess: () => void }
      deleteOptions.onSuccess()
      expect(toast.success).toHaveBeenCalledWith('Dave has been deleted')
      expect(onActionComplete).toHaveBeenCalledOnce()
    })

    it('onError calls toast.error with error message', () => {
      mutationCalls.length = 0
      useUserMutations('user-1', 'Dave', vi.fn())
      const deleteOptions = mutationCalls[2] as { onError: (err: unknown) => void }
      deleteOptions.onError(new Error('Delete failed'))
      expect(toast.error).toHaveBeenCalledWith('Delete failed')
    })

    it('onError falls back to default message', () => {
      mutationCalls.length = 0
      useUserMutations('user-1', 'Dave', vi.fn())
      const deleteOptions = mutationCalls[2] as { onError: (err: unknown) => void }
      deleteOptions.onError(42)
      expect(toast.error).toHaveBeenCalledWith('Failed to delete user')
    })
  })

  describe('restoreMutation', () => {
    it('mutationFn calls restoreAdminUser with userId', async () => {
      mutationCalls.length = 0
      useUserMutations('user-13', 'Eve', vi.fn())
      const restoreOptions = mutationCalls[3] as { mutationFn: () => Promise<unknown> }
      await restoreOptions.mutationFn()
      expect(api.restoreAdminUser).toHaveBeenCalledWith('user-13')
    })

    it('onSuccess calls toast.success with userName + restored', () => {
      mutationCalls.length = 0
      const onActionComplete = vi.fn()
      useUserMutations('user-1', 'Eve', onActionComplete)
      const restoreOptions = mutationCalls[3] as { onSuccess: () => void }
      restoreOptions.onSuccess()
      expect(toast.success).toHaveBeenCalledWith('Eve has been restored')
      expect(onActionComplete).toHaveBeenCalledOnce()
    })

    it('onError calls toast.error with error message', () => {
      mutationCalls.length = 0
      useUserMutations('user-1', 'Eve', vi.fn())
      const restoreOptions = mutationCalls[3] as { onError: (err: unknown) => void }
      restoreOptions.onError(new Error('Restore failed'))
      expect(toast.error).toHaveBeenCalledWith('Restore failed')
    })

    it('onError falls back to default message', () => {
      mutationCalls.length = 0
      useUserMutations('user-1', 'Eve', vi.fn())
      const restoreOptions = mutationCalls[3] as { onError: (err: unknown) => void }
      restoreOptions.onError(null)
      expect(toast.error).toHaveBeenCalledWith('Failed to restore user')
    })
  })
})
