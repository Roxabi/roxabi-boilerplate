import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { fetchOrganizations } from '@/lib/api'
import { ApiError } from '@/lib/apiClient'

type Organization = {
  id: string
  name: string
  slug: string
  logo: string | null
  createdAt: string
}

export const ORGANIZATIONS_QUERY_KEY = ['organizations'] as const

/**
 * @param sessionKey - Pass a session-dependent value (e.g. user ID) so orgs
 *   are refetched when the session changes (login/logout).
 */
export function useOrganizations(sessionKey?: string | null) {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<Organization[]>({
    queryKey: [...ORGANIZATIONS_QUERY_KEY, sessionKey],
    queryFn: async ({ signal }) => {
      const res = await fetchOrganizations(signal)
      if (!res.ok) {
        throw new ApiError(res.status, `Failed to fetch organizations`)
      }
      return res.json()
    },
    staleTime: 30_000,
    enabled: sessionKey !== undefined,
  })

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY })
  }, [queryClient])

  return { data, isLoading, error, refetch }
}
