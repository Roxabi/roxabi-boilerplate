import { isErrorWithMessage } from './errorUtils'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown = null
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
  })

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      throw new ApiError(res.status, `HTTP ${res.status}`)
    }
    const message = isErrorWithMessage(body) ? body.message : `HTTP ${res.status}`
    throw new ApiError(res.status, message, body)
  }

  if (res.status === 204) return undefined as T

  try {
    return (await res.json()) as T
  } catch {
    throw new ApiError(res.status, 'Malformed JSON response')
  }
}
