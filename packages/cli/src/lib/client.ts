import { loadCredentials } from './credentials.js'

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiClient {
  get<T>(path: string, params?: Record<string, string>): Promise<T>
  delete(path: string): Promise<void>
  patch<T>(path: string, body: unknown): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
}

async function parseErrorBody(response: Response): Promise<{ code: string; message: string }> {
  try {
    const errorBody = (await response.json()) as {
      error?: { code?: string; message?: string }
    }
    return {
      code: errorBody.error?.code ?? 'UNKNOWN_ERROR',
      message: errorBody.error?.message ?? `HTTP ${response.status}`,
    }
  } catch {
    return { code: 'UNKNOWN_ERROR', message: `HTTP ${response.status}` }
  }
}

export function createClient(apiUrl?: string, token?: string): ApiClient {
  const credentials = loadCredentials()
  const baseUrl = apiUrl ?? credentials?.apiUrl
  const authToken = token ?? credentials?.token

  if (!(baseUrl && authToken)) {
    throw new Error('Not authenticated. Run `roxabi auth login --token <token>` first.')
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    if (!path.startsWith('/')) {
      throw new Error(`API path must be relative (start with /), got: ${path}`)
    }
    const url = new URL(path, baseUrl)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value)
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const { code, message } = await parseErrorBody(response)
      throw new ApiError(response.status, code, message)
    }

    if (response.status === 204) return undefined as T

    return (await response.json()) as T
  }

  return {
    get: <T>(path: string, params?: Record<string, string>) =>
      request<T>('GET', path, undefined, params),
    delete: (path: string) => request<void>('DELETE', path),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  }
}
