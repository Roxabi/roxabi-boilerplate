/**
 * Shared error handling utilities for API response parsing.
 */

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
