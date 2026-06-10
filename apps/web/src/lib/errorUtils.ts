/**
 * Shared error handling utilities for API response parsing.
 */

import { ApiError } from './apiClient'

export function isErrorWithMessage(value: unknown): value is { message: string } {
  return (
    value != null &&
    typeof value === 'object' &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  )
}

export function parseErrorMessage(data: unknown, fallback: string): string {
  return isErrorWithMessage(data) ? data.message : fallback
}

/**
 * Type guard for API errors thrown by `updateProfile`.
 * Distinguishes intentional API errors (non-ok HTTP response) from network errors.
 */
export function isApiError(err: unknown): err is Error & { isApiError: true } {
  return (
    err instanceof Error &&
    'isApiError' in err &&
    (err as { isApiError: unknown }).isApiError === true
  )
}

/**
 * Maps an ApiError to the product copy: server-provided message wins,
 * otherwise a per-status (or generic) fallback. `ApiError.message` already
 * holds the extracted server message when the body carried one — when it
 * doesn't, apiClient sets a generic `HTTP <status>` / parse-failure message,
 * which we replace with the caller's copy.
 */
export function apiErrorToMessage(
  err: unknown,
  fallback: string,
  byStatus?: Record<number, string>
): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: unknown } | null
    if (typeof body === 'object' && typeof body?.message === 'string') return body.message
    return byStatus?.[err.status] ?? fallback
  }
  return err instanceof Error ? err.message : fallback
}
