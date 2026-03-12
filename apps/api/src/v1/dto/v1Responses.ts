// Response types for V1 Public API

export interface V1ErrorEnvelope {
  error: {
    code: string
    message: string
    statusCode: number
  }
}

export interface V1UserMeResponse {
  id: string
  name: string
  email: string | null
  image: string | null
}

export interface V1OrganizationResponse {
  id: string
  name: string
  slug: string
  logo: string | null
  createdAt: string
}

export interface V1MemberResponse {
  id: string
  userId: string
  name: string
  email: string
  role: string
  joinedAt: string
}

export interface V1InvitationResponse {
  id: string
  email: string
  role: string
  status: string
  invitedAt: string
  expiresAt: string | null
}

export interface V1RoleResponse {
  id: string
  name: string
  description: string | null
  permissions: string[]
}

export interface V1PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
