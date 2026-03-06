export const adminOrgKeys = {
  all: ['admin', 'organizations'] as const,
  list: <T>(filters: T) => [...adminOrgKeys.all, 'list', filters] as const,
  tree: () => [...adminOrgKeys.all, 'tree'] as const,
  allForParent: () => [...adminOrgKeys.all, 'all-for-parent'] as const,
  filterOptions: () => [...adminOrgKeys.all, 'filter-options'] as const,
  detail: (orgId: string) => [...adminOrgKeys.all, orgId] as const,
  roles: (orgId: string) => [...adminOrgKeys.all, orgId, 'roles'] as const,
  deletionImpact: (orgId: string) => [...adminOrgKeys.all, orgId, 'deletion-impact'] as const,
} as const

export const adminUserKeys = {
  all: ['admin', 'users'] as const,
  list: <T>(filters: T) => [...adminUserKeys.all, 'list', filters] as const,
  detail: (userId: string) => [...adminUserKeys.all, 'detail', userId] as const,
} as const

export const adminAuditKeys = {
  all: ['admin', 'audit-logs'] as const,
  list: <T>(filters: T) => [...adminAuditKeys.all, filters] as const,
} as const

export const adminSettingsKeys = {
  all: ['admin', 'system-settings'] as const,
} as const
