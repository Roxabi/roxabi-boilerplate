import type { AdminUser } from '@repo/types'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Outlet, useMatch } from '@tanstack/react-router'
import { ShieldIcon, UsersIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FilterConfig } from '@/components/admin/FilterBar'
import { FilterBar } from '@/components/admin/FilterBar'
import { LoadMoreButton } from '@/components/admin/LoadMoreButton'
import { UserContextMenu, UserKebabButton } from '@/components/admin/UserContextMenu'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { adminOrgKeys, adminUserKeys } from '@/lib/admin/queryKeys'
import { appName } from '@/lib/appName'
import { formatDate } from '@/lib/formatDate'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { enforceRoutePermission } from '@/lib/routePermissions'
import { statusLabel, statusVariant } from '@/lib/userStatus'

export const Route = createFileRoute('/admin/users')({
  staticData: { permission: 'role:superadmin' },
  beforeLoad: enforceRoutePermission,
  component: AdminUsersPage,
  head: () => ({ meta: [{ title: `Users | Admin | ${appName}` }] }),
})

type UserFilters = {
  role: string
  status: string
  organizationId: string
  search: string
}

const INITIAL_FILTERS: UserFilters = {
  role: '',
  status: '',
  organizationId: '',
  search: '',
}

const FILTER_CONFIGS: FilterConfig[] = [
  {
    key: 'role',
    label: 'Role',
    type: 'select',
    options: [
      { value: 'user', label: 'User' },
      { value: 'superadmin', label: 'Super Admin' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'banned', label: 'Banned' },
      { value: 'archived', label: 'Archived' },
    ],
  },
  {
    key: 'search',
    label: 'Search',
    type: 'search',
    placeholder: 'Search by name or email...',
  },
]

function UsersTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
        <div key={i} className="flex items-center gap-4 px-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <UsersIcon className="size-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">No users found</p>
    </div>
  )
}

function useOrgFilterConfigs(): FilterConfig[] {
  const { data: orgsData } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: adminOrgKeys.filterOptions(),
    queryFn: async () => {
      const res = await fetch('/api/admin/organizations?limit=100')
      if (!res.ok) throw new Error('Failed to fetch organizations')
      return res.json()
    },
  })

  return useMemo<FilterConfig[]>(
    () => [
      ...FILTER_CONFIGS,
      {
        key: 'organizationId',
        label: 'Organization',
        type: 'select',
        options: (orgsData?.data ?? []).map((o) => ({ value: o.id, label: o.name })),
      },
    ],
    [orgsData]
  )
}

function AdminUsersPage() {
  const childMatch = useMatch({ from: '/admin/users/$userId', shouldThrow: false })
  if (childMatch) return <Outlet />

  return <AdminUsersList />
}

function AdminUsersList() {
  const [filters, setFilters] = useState<UserFilters>(INITIAL_FILTERS)
  const filterConfigs = useOrgFilterConfigs()

  const {
    data: users,
    loadMore,
    hasMore,
    isLoading,
    isLoadingMore,
    refetch,
  } = useCursorPagination<AdminUser>({
    queryKey: adminUserKeys.list(filters),
    fetchFn: async (cursor) => {
      const params = new URLSearchParams()
      if (cursor) params.set('cursor', cursor)
      if (filters.role) params.set('role', filters.role)
      if (filters.status) params.set('status', filters.status)
      if (filters.organizationId) params.set('organizationId', filters.organizationId)
      if (filters.search) params.set('search', filters.search)
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json()
    },
  })

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function handleFilterReset() {
    setFilters(INITIAL_FILTERS)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldIcon className="size-6 text-foreground" />
        <h1 className="text-2xl font-bold">Users</h1>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
      />

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <UsersTableSkeleton />
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && users.length === 0 && <EmptyState />}

      {/* Users table */}
      {!isLoading && users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Orgs</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <UserContextMenu key={user.id} user={user} onActionComplete={() => refetch()}>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link
                          to="/admin/users/$userId"
                          params={{ userId: user.id }}
                          className="font-medium text-foreground hover:underline"
                        >
                          {user.name || 'Unnamed'}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {user.role ?? 'user'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.organizationCount ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.lastActive ? formatRelativeTime(user.lastActive) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(user)}>{statusLabel(user)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <UserKebabButton user={user} onActionComplete={() => refetch()} />
                      </TableCell>
                    </TableRow>
                  </UserContextMenu>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Load more */}
      <LoadMoreButton onClick={loadMore} hasMore={hasMore} isLoading={isLoadingMore} />
    </div>
  )
}
