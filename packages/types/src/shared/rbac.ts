/** Resource types that can have permissions */
export type PermissionResource =
  | 'users'
  | 'organizations'
  | 'members'
  | 'invitations'
  | 'roles'
  | 'api_keys'

/** Actions that can be performed on resources */
export type PermissionAction = 'read' | 'write' | 'delete'

/** Permission string format: `resource:action` */
export type PermissionString = `${PermissionResource}:${PermissionAction}`

/** Default role slugs seeded per organization */
export type DefaultRoleSlug = 'owner' | 'admin' | 'member' | 'viewer'

export type Permission = {
  id: string
  resource: PermissionResource
  action: PermissionAction
  description: string
  createdAt: Date
}

export type OrgRole = {
  id: string
  tenantId: string
  name: string
  slug: string
  description: string | null
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export type RolePermission = {
  roleId: string
  permissionId: string
}
