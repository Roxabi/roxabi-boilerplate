import type { CursorPaginatedResponse } from '@repo/types'
import { useInfiniteQuery } from '@tanstack/react-query'

/**
 * useCursorPagination — wraps TanStack Query's useInfiniteQuery for cursor-based pagination.
 *
 * Returns { data, loadMore, hasMore, isLoading, isLoadingMore, error }.
 * Used by all three Phase 2 list pages (users, organizations, audit logs).
 */

type UseCursorPaginationOptions<T> = {
  queryKey: ReadonlyArray<unknown>
  fetchFn: (cursor?: string) => Promise<CursorPaginatedResponse<T>>
  enabled?: boolean
}

export function useCursorPagination<T>(options: UseCursorPaginationOptions<T>) {
  const query = useInfiniteQuery({
    queryKey: options.queryKey,
    queryFn: ({ pageParam }) => options.fetchFn(pageParam ?? undefined),
    getNextPageParam: (lastPage) => (lastPage.cursor.hasMore ? lastPage.cursor.next : undefined),
    initialPageParam: undefined as string | undefined,
    enabled: options.enabled,
  })

  const data = query.data?.pages.flatMap((page) => page.data) ?? []
  const lastPage = query.data?.pages[query.data.pages.length - 1]
  const hasMore = lastPage?.cursor.hasMore ?? false

  return {
    data,
    loadMore: () => query.fetchNextPage(),
    hasMore,
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    error: query.error,
    refetch: query.refetch,
  }
}
