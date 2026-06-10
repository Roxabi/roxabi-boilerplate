import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  banAdminUser,
  deleteAdminOrganization,
  deleteAdminUser,
  restoreAdminOrganization,
  restoreAdminUser,
  unbanAdminUser,
} from './api'

export function useOrgMutations(orgId: string, orgName: string, onActionComplete: () => void) {
  const deleteMutation = useMutation({
    mutationFn: async () => deleteAdminOrganization(orgId),
    onSuccess: () => {
      toast.success(`${orgName} has been archived`)
      onActionComplete()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete organization')
    },
  })

  const restoreMutation = useMutation({
    mutationFn: async () => restoreAdminOrganization(orgId),
    onSuccess: () => {
      toast.success(`${orgName} has been restored`)
      onActionComplete()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to restore organization')
    },
  })

  return { deleteMutation, restoreMutation }
}

export function useUserMutations(userId: string, userName: string, onActionComplete: () => void) {
  const banMutation = useMutation({
    mutationFn: async ({ reason, expires }: { reason: string; expires?: string }) => {
      await banAdminUser(userId, reason, expires)
    },
    onSuccess: () => {
      toast.success(`${userName} has been banned`)
      onActionComplete()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to ban user')
    },
  })

  const unbanMutation = useMutation({
    mutationFn: async () => unbanAdminUser(userId),
    onSuccess: () => {
      toast.success(`${userName} has been unbanned`)
      onActionComplete()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to unban user')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => deleteAdminUser(userId),
    onSuccess: () => {
      toast.success(`${userName} has been deleted`)
      onActionComplete()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user')
    },
  })

  const restoreMutation = useMutation({
    mutationFn: async () => restoreAdminUser(userId),
    onSuccess: () => {
      toast.success(`${userName} has been restored`)
      onActionComplete()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to restore user')
    },
  })

  return { banMutation, unbanMutation, deleteMutation, restoreMutation }
}
