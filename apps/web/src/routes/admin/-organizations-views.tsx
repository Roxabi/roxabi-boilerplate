import type { AdminOrganization } from '@repo/types'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { BuildingIcon } from 'lucide-react'
import { LoadMoreButton } from '@/components/admin/LoadMoreButton'
import { OrgListContextMenu, OrgListKebabButton } from '@/components/admin/OrgListContextMenu'
import { TreeView } from '@/components/admin/TreeView'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { adminOrgKeys } from '@/lib/admin/queryKeys'
import { formatDate } from '@/lib/formatDate'
import { m } from '@/paraglide/messages'
import type { OrgFilters } from './-organizations-types'

type TreeApiResponse = {
  data: AdminOrganization[]
  treeViewAvailable: boolean
}

function statusVariant(org: AdminOrganization): 'default' | 'secondary' {
  if (org.deletedAt) return 'secondary'
  return 'default'
}

function statusLabel(org: AdminOrganization): string {
  if (org.deletedAt) return 'Archived'
  return 'Active'
}

function OrgTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
        <div key={i} className="flex items-center gap-4 px-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

function FlatListView({ filters }: { filters: OrgFilters }) {
  const {
    data: organizations,
    loadMore,
    hasMore,
    isLoading,
    isLoadingMore,
    refetch,
  } = useCursorPagination<AdminOrganization>({
    queryKey: adminOrgKeys.list(filters),
    fetchFn: async (cursor) => {
      const params = new URLSearchParams()
      if (cursor) params.set('cursor', cursor)
      if (filters.status) params.set('status', filters.status)
      if (filters.search) params.set('search', filters.search)
      const res = await fetch(`/api/admin/organizations?${params}`)
      if (!res.ok) throw new Error('Failed to fetch organizations')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgTableSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (organizations.length === 0) {
    return (
      <EmptyState icon={<BuildingIcon className="size-10" />} description={m.admin_orgs_empty()} />
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <OrgListContextMenu key={org.id} org={org} onActionComplete={() => refetch()}>
                  <TableRow className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link
                        to="/admin/organizations/$orgId"
                        params={{ orgId: org.id }}
                        className="font-medium text-foreground hover:underline"
                      >
                        {org.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{org.slug ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {org.parentOrganizationId ? (
                        <Link
                          to="/admin/organizations/$orgId"
                          params={{ orgId: org.parentOrganizationId }}
                          className="hover:underline"
                        >
                          View parent
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{org.memberCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(org)}>{statusLabel(org)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(org.createdAt)}
                    </TableCell>
                    <TableCell>
                      <OrgListKebabButton org={org} onActionComplete={() => refetch()} />
                    </TableCell>
                  </TableRow>
                </OrgListContextMenu>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <LoadMoreButton onClick={loadMore} hasMore={hasMore} isLoading={isLoadingMore} />
    </>
  )
}

function TreeModeView() {
  const navigate = useNavigate()

  const {
    data: treeData,
    isLoading,
    error,
  } = useQuery<TreeApiResponse>({
    queryKey: adminOrgKeys.tree(),
    queryFn: async () => {
      const res = await fetch('/api/admin/organizations?view=tree')
      if (!res.ok) throw new Error('Failed to fetch organizations')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Tree</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgTableSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Failed to load organizations'}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (treeData && !treeData.treeViewAvailable) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Too many organizations for tree view, use flat list instead.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!treeData || treeData.data.length === 0) {
    return (
      <EmptyState icon={<BuildingIcon className="size-10" />} description={m.admin_orgs_empty()} />
    )
  }

  function handleSelect(id: string) {
    navigate({ to: '/admin/organizations/$orgId', params: { orgId: id } })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Tree</CardTitle>
      </CardHeader>
      <CardContent>
        <TreeView
          nodes={treeData.data.map((org) => ({
            id: org.id,
            name: org.name,
            slug: org.slug,
            parentOrganizationId: org.parentOrganizationId,
            memberCount: org.memberCount,
            deletedAt: org.deletedAt,
          }))}
          onSelect={handleSelect}
        />
      </CardContent>
    </Card>
  )
}

export { FlatListView, TreeModeView }
