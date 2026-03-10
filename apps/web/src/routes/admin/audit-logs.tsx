import type { AuditLogEntry } from '@repo/types'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronDownIcon, ChevronRightIcon, ScrollTextIcon } from 'lucide-react'
import { useState } from 'react'
import { DiffViewer } from '@/components/admin/DiffViewer'
import type { FilterConfig } from '@/components/admin/FilterBar'
import { FilterBar } from '@/components/admin/FilterBar'
import { LoadMoreButton } from '@/components/admin/LoadMoreButton'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { adminAuditKeys } from '@/lib/admin/queryKeys'
import { appName } from '@/lib/appName'
import { formatTimestamp } from '@/lib/formatDate'
import { enforceRoutePermission } from '@/lib/routePermissions'

export const Route = createFileRoute('/admin/audit-logs')({
  staticData: { permission: 'role:superadmin' },
  beforeLoad: enforceRoutePermission,
  component: AdminAuditLogsPage,
  head: () => ({ meta: [{ title: `Audit Logs | Admin | ${appName}` }] }),
})

type AuditEntry = Omit<AuditLogEntry, 'timestamp' | 'action' | 'actorType'> & {
  timestamp: string // API serializes dates as strings
  actorName: string // enriched by the API
  actorType: string // API may return values outside the strict union
  action: string // API may return values outside the strict union
}

type AuditLogFilters = {
  from: string
  to: string
  actorId: string
  action: string
  resource: string
  organizationId: string
  search: string
}

const INITIAL_FILTERS: AuditLogFilters = {
  from: '',
  to: '',
  actorId: '',
  action: '',
  resource: '',
  organizationId: '',
  search: '',
}

const AUDIT_ACTION_OPTIONS = [
  { value: 'user.created', label: 'User Created' },
  { value: 'user.updated', label: 'User Updated' },
  { value: 'user.banned', label: 'User Banned' },
  { value: 'user.unbanned', label: 'User Unbanned' },
  { value: 'user.deleted', label: 'User Deleted' },
  { value: 'user.restored', label: 'User Restored' },
  { value: 'user.role_changed', label: 'User Role Changed' },
  { value: 'member.invited', label: 'Member Invited' },
  { value: 'member.role_changed', label: 'Member Role Changed' },
  { value: 'member.removed', label: 'Member Removed' },
  { value: 'invitation.revoked', label: 'Invitation Revoked' },
  { value: 'org.created', label: 'Org Created' },
  { value: 'org.updated', label: 'Org Updated' },
  { value: 'org.deleted', label: 'Org Deleted' },
  { value: 'org.restored', label: 'Org Restored' },
  { value: 'org.parent_changed', label: 'Org Parent Changed' },
  { value: 'settings.updated', label: 'Settings Updated' },
  { value: 'impersonation.started', label: 'Impersonation Started' },
  { value: 'impersonation.ended', label: 'Impersonation Ended' },
]

const FILTER_CONFIGS: FilterConfig[] = [
  { key: 'from', label: 'From', type: 'date' },
  { key: 'to', label: 'To', type: 'date' },
  { key: 'action', label: 'Action', type: 'select', options: AUDIT_ACTION_OPTIONS },
  { key: 'resource', label: 'Resource', type: 'search', placeholder: 'e.g. user' },
  { key: 'actorId', label: 'Actor ID', type: 'search', placeholder: 'UUID...' },
  { key: 'organizationId', label: 'Org ID', type: 'search', placeholder: 'UUID...' },
  { key: 'search', label: 'Search', type: 'search', placeholder: 'Search...' },
]

const FILTER_PARAM_KEYS = [
  'from',
  'to',
  'actorId',
  'action',
  'resource',
  'organizationId',
  'search',
] as const

function buildAuditLogParams(
  cursor: string | undefined,
  filters: AuditLogFilters
): URLSearchParams {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  for (const key of FILTER_PARAM_KEYS) {
    const value = filters[key]
    if (value) params.set(key, value)
  }
  return params
}

function actionVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action.includes('delete') || action.includes('remove') || action.includes('ban')) {
    return 'destructive'
  }
  if (action.includes('create') || action.includes('add') || action.includes('invite')) {
    return 'default'
  }
  if (action.includes('update') || action.includes('change') || action.includes('edit')) {
    return 'secondary'
  }
  return 'outline'
}

function AuditLogsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
        <div key={i} className="flex items-center gap-4 px-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <ScrollTextIcon className="size-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">No audit log entries found</p>
    </div>
  )
}

function AdminAuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogFilters>(INITIAL_FILTERS)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const {
    data: entries,
    loadMore,
    hasMore,
    isLoading,
    isLoadingMore,
  } = useCursorPagination<AuditEntry>({
    queryKey: adminAuditKeys.list(filters),
    fetchFn: async (cursor) => {
      const params = buildAuditLogParams(cursor, filters)
      const res = await fetch(`/api/admin/audit-logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch audit logs')
      return res.json()
    },
  })

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function handleFilterReset() {
    setFilters(INITIAL_FILTERS)
    setExpandedIds(new Set())
  }

  function toggleRow(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ScrollTextIcon className="size-6 text-foreground" />
        <h1 className="text-2xl font-bold">Audit Logs</h1>
      </div>

      {/* Filters */}
      <FilterBar
        filters={FILTER_CONFIGS}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
      />

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditLogsSkeleton />
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && entries.length === 0 && <EmptyState />}

      {/* Audit logs table */}
      {!isLoading && entries.length > 0 && (
        <AuditLogsTable entries={entries} expandedIds={expandedIds} onToggleRow={toggleRow} />
      )}

      {/* Load more */}
      <LoadMoreButton onClick={loadMore} hasMore={hasMore} isLoading={isLoadingMore} />
    </div>
  )
}

type AuditLogsTableProps = {
  entries: AuditEntry[]
  expandedIds: Set<string>
  onToggleRow: (id: string) => void
}

function AuditLogsTable({ entries, expandedIds, onToggleRow }: AuditLogsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Resource ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <AuditLogRow
                key={entry.id}
                entry={entry}
                isExpanded={expandedIds.has(entry.id)}
                onToggle={() => onToggleRow(entry.id)}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

type AuditLogRowProps = {
  entry: AuditEntry
  isExpanded: boolean
  onToggle: () => void
}

function AuditLogRow({ entry, isExpanded, onToggle }: AuditLogRowProps) {
  const hasDiff = entry.before !== null || entry.after !== null

  return (
    <>
      <TableRow
        className={cn('hover:bg-muted/50', hasDiff && 'cursor-pointer')}
        onClick={hasDiff ? onToggle : undefined}
      >
        <TableCell className="w-8 px-2">
          {hasDiff && (
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
              className="inline-flex items-center"
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
            >
              {isExpanded ? (
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              )}
            </button>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
          {formatTimestamp(entry.timestamp)}
        </TableCell>
        <TableCell className="font-medium">{entry.actorName}</TableCell>
        <TableCell>
          <Badge variant={actionVariant(entry.action)} className="font-mono text-xs">
            {entry.action}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">{entry.resource}</TableCell>
        <TableCell className="text-muted-foreground font-mono text-xs">
          {entry.resourceId}
        </TableCell>
      </TableRow>

      {isExpanded && hasDiff && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 p-4">
            <DiffViewer before={entry.before} after={entry.after} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
