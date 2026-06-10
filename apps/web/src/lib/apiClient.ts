/**
 * Structured API client for the frontend.
 * All helpers throw ApiError on non-ok responses; they never return [] on failure.
 */

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

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  // No-body successes (204, empty DELETE responses) have nothing to parse
  if (!text) {
    return undefined as unknown as T
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError(res.status, 'Malformed JSON response', text)
  }
}

async function parseErrorBody(res: Response): Promise<{ message: string; body: unknown }> {
  const body = await parseJson<unknown>(res)
  const message =
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof (body as { message: unknown }).message === 'string'
      ? (body as { message: string }).message
      : `HTTP ${res.status}`
  return { message, body }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const { message, body } = await parseErrorBody(res)
    throw new ApiError(res.status, message, body)
  }

  return parseJson<T>(res)
}

export async function apiGet<T>(
  url: string,
  params?: Record<string, string>,
  signal?: AbortSignal
): Promise<T> {
  const urlObj = new URL(url, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) urlObj.searchParams.set(key, value)
    }
  }
  return apiFetch<T>(urlObj.toString(), { signal })
}

export async function apiPost<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body), signal })
}

export async function apiPatch<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return apiFetch<T>(url, { method: 'PATCH', body: JSON.stringify(body), signal })
}

export async function apiDelete(url: string, body?: unknown, signal?: AbortSignal): Promise<void> {
  await apiFetch<void>(url, {
    method: 'DELETE',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal,
  })
}
