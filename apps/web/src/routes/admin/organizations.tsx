import { Button } from '@repo/ui'
import { createFileRoute, Outlet, useMatch } from '@tanstack/react-router'
import { BuildingIcon, ListIcon, NetworkIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import type { FilterConfig } from '@/components/admin/FilterBar'
import { FilterBar } from '@/components/admin/FilterBar'
import { appName } from '@/lib/appName'
import { enforceRoutePermission } from '@/lib/routePermissions'
import { CreateOrganizationDialog } from './-organizations-create-dialog'
import type { OrgFilters } from './-organizations-types'
import { FlatListView, TreeModeView } from './-organizations-views'

export const Route = createFileRoute('/admin/organizations')({
  staticData: { permission: 'role:superadmin' },
  beforeLoad: enforceRoutePermission,
  component: AdminOrganizationsPage,
  head: () => ({ meta: [{ title: `Organizations | Admin | ${appName}` }] }),
})

const INITIAL_FILTERS: OrgFilters = {
  status: '',
  search: '',
}

const FILTER_CONFIGS: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'archived', label: 'Archived' },
    ],
  },
  {
    key: 'search',
    label: 'Search',
    type: 'search',
    placeholder: 'Search by name or slug...',
  },
]

type ViewMode = 'list' | 'tree'

function AdminOrganizationsPage() {
  const childMatch = useMatch({ from: '/admin/organizations/$orgId', shouldThrow: false })
  if (childMatch) return <Outlet />

  return <AdminOrganizationsList />
}

function AdminOrganizationsList() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filters, setFilters] = useState<OrgFilters>(INITIAL_FILTERS)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function handleFilterReset() {
    setFilters(INITIAL_FILTERS)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BuildingIcon className="size-6 text-foreground" />
          <h1 className="text-2xl font-bold">Organizations</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
            <PlusIcon className="size-3.5" />
            Create Organization
          </Button>
          <div className="flex gap-1 rounded-md border p-0.5">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-1.5"
              aria-pressed={viewMode === 'list'}
            >
              <ListIcon className="size-3.5" />
              List
            </Button>
            <Button
              variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('tree')}
              className="gap-1.5"
              aria-pressed={viewMode === 'tree'}
            >
              <NetworkIcon className="size-3.5" />
              Tree
            </Button>
          </div>
        </div>
      </div>

      <CreateOrganizationDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

      {/* Filters (only in list mode) */}
      {viewMode === 'list' && (
        <FilterBar
          filters={FILTER_CONFIGS}
          values={filters}
          onChange={handleFilterChange}
          onReset={handleFilterReset}
        />
      )}

      {/* Content */}
      {viewMode === 'list' ? <FlatListView filters={filters} /> : <TreeModeView />}
    </div>
  )
}
