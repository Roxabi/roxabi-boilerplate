export type ApiKey = {
  id: string
  name: string
  keyPrefix: string
  lastFour: string
  scopes: string[]
  rateLimitTier: string
  expiresAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export type CreateApiKeyRequest = {
  name: string
  scopes: string[]
  expiresAt?: string | null
}

export type CreateApiKeyResponse = {
  id: string
  name: string
  key: string
  keyPrefix: string
  lastFour: string
  scopes: string[]
  expiresAt: string | null
  createdAt: string
}

export type ListApiKeysResponse = {
  data: ApiKey[]
}

export type RevokeApiKeyResponse = {
  id: string
  revokedAt: string
}
