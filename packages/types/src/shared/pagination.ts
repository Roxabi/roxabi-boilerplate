/** Cursor metadata for cursor-based pagination responses */
export type CursorPaginationMeta = {
  next: string | null
  hasMore: boolean
}

/** Generic cursor-paginated response wrapper */
export type CursorPaginatedResponse<T> = {
  data: T[]
  cursor: CursorPaginationMeta
}
