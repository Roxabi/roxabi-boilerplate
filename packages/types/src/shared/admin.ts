import type { AuditLogEntry } from './audit'

/** Org member as returned by the admin members API */
export type Member = {
  id: string
  userId: string
  role: string
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

/** Pagination metadata returned alongside paginated API responses */
export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

/** Response shape for the admin members list endpoint */
export type MembersResponse = {
  data: Member[]
  pagination: PaginationMeta
}

// --- Phase 2: Cross-tenant types ---

/** Admin user as returned by the cross-tenant users API */
export type AdminUser = {
  id: string
  name: string
  email: string
  role: string | null
  banned: boolean | null
  banReason: string | null
  banExpires: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  organizations: { id: string; name: string; slug: string | null; role: string }[]
  /** Number of organizations the user belongs to (#312) */
  organizationCount: number
  /** ISO timestamp of last audit log entry, or null if never active (#312) */
  lastActive: string | null
}

/** Extended user detail with activity summary */
export type AdminUserDetail = AdminUser & {
  image: string | null
  activitySummary: AuditLogEntry[]
  /** True when this user is the only active (non-banned, non-deleted) superadmin */
  isLastActiveSuperadmin: boolean
}

/** Filter parameters for the admin users list */
export type UserFilters = {
  role?: string
  status?: string
  organizationId?: string
  search?: string
}

/** Admin organization as returned by the cross-tenant organizations API */
export type AdminOrganization = {
  id: string
  name: string
  slug: string | null
  parentOrganizationId: string | null
  memberCount: number
  childCount: number
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Extended organization detail with members and children */
export type AdminOrgDetail = AdminOrganization & {
  parentOrganization: { id: string; name: string; slug: string | null } | null
  members: {
    id: string
    userId: string
    name: string
    email: string
    role: string
    roleId: string | null
    createdAt: string
  }[]
  children: { id: string; name: string; slug: string | null; memberCount: number }[]
}

/** Filter parameters for the admin organizations list */
export type OrgFilters = {
  status?: string
  search?: string
  view?: 'list' | 'tree'
}

/** Filter parameters for the admin audit log list */
export type AuditLogFilters = {
  from?: string
  to?: string
  actorId?: string
  action?: string
  resource?: string
  organizationId?: string
  search?: string
}

/** Impact preview for organization deletion */
export type OrgDeletionImpact = {
  memberCount: number
  activeMembers: number
  childOrgCount: number
  childMemberCount: number
}

// --- Phase 3: System Settings & Feature Flags ---

/** Setting value type discriminant */
export type SettingType = 'string' | 'number' | 'boolean' | 'select'

/** System setting as returned by the admin settings API */
export type SystemSetting = {
  id: string
  key: string
  value: unknown
  type: SettingType
  name: string
  description: string | null
  category: string
  metadata: { options?: string[] } | null
  createdAt: string
  updatedAt: string
}

/** Batch update payload for PATCH /api/admin/settings */
export type SettingsUpdatePayload = {
  updates: Array<{ key: string; value: unknown }>
}

/** Settings grouped by category */
export type SettingsByCategory = {
  [category: string]: SystemSetting[]
}

/** Feature flag as returned by the admin feature-flags API */
export type FeatureFlag = {
  id: string
  key: string
  name: string
  description: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/** Payload for POST /api/admin/feature-flags */
export type CreateFeatureFlagPayload = {
  name: string
  key: string
  description?: string
}

/** Payload for PATCH /api/admin/feature-flags/:id */
export type UpdateFeatureFlagPayload = {
  name?: string
  description?: string
  enabled?: boolean
}
