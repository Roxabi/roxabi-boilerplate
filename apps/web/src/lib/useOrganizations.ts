import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { apiGet } from '@/lib/apiClient'

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
      return apiGet<Organization[]>('/api/organizations', undefined, signal)
    },
    staleTime: 30_000,
    enabled: sessionKey !== undefined,
  })

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY })
  }, [queryClient])

  return { data, isLoading, error, refetch }
}
