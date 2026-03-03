import type {
  ApiKey,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ListApiKeysResponse,
  RevokeApiKeyResponse,
} from '@repo/types'

/**
 * API functions for API Key management.
 * All functions include credentials for cookie-based session auth.
 */

export type {
  ApiKey,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ListApiKeysResponse,
  RevokeApiKeyResponse,
}

export async function listApiKeys(signal?: AbortSignal): Promise<ListApiKeysResponse> {
  const res = await fetch('/api/api-keys', {
    credentials: 'include',
    signal,
  })
  if (!res.ok) {
    throw new Error(`Failed to list API keys: ${res.status}`)
  }
  return res.json() as Promise<ListApiKeysResponse>
}

export async function createApiKey(data: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
  const res = await fetch('/api/api-keys', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const errorData = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(errorData?.message ?? `Failed to create API key: ${res.status}`)
  }
  return res.json() as Promise<CreateApiKeyResponse>
}

export async function revokeApiKey(id: string): Promise<RevokeApiKeyResponse> {
  const res = await fetch(`/api/api-keys/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) {
    const errorData = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(errorData?.message ?? `Failed to revoke API key: ${res.status}`)
  }
  return res.json() as Promise<RevokeApiKeyResponse>
}
