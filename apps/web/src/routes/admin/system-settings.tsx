import type { SettingsByCategory } from '@repo/types'
import { Card, CardContent, CardHeader, Skeleton } from '@repo/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { SettingsIcon } from 'lucide-react'
import { toast } from 'sonner'
import { SettingsCard } from '@/components/admin/SettingsCard'
import { isErrorWithMessage } from '@/lib/errorUtils'
import { enforceRoutePermission } from '@/lib/routePermissions'

export const Route = createFileRoute('/admin/system-settings')({
  staticData: { permission: 'role:superadmin' },
  beforeLoad: enforceRoutePermission,
  component: SystemSettingsPage,
  head: () => ({ meta: [{ title: 'System Settings | Admin | Roxabi' }] }),
})

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-64" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-64" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <SettingsIcon className="size-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">No system settings found</p>
    </div>
  )
}

function SystemSettingsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<SettingsByCategory>({
    queryKey: ['admin', 'system-settings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/settings', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch system settings')
      return res.json()
    },
  })

  const grouped = data ?? {}
  const sortedCategories = Object.keys(grouped).sort()

  async function handleSave(updates: Array<{ key: string; value: unknown }>) {
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })

    if (!res.ok) {
      const body: unknown = await res.json().catch(() => null)
      const message = isErrorWithMessage(body) ? body.message : 'Failed to save settings'
      toast.error(message)
      throw new Error(message)
    }

    toast.success('Settings updated successfully')
    await queryClient.invalidateQueries({ queryKey: ['admin', 'system-settings'] })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="size-6 text-foreground" />
        <h1 className="text-2xl font-bold">System Settings</h1>
      </div>

      {/* Loading state */}
      {isLoading && <SettingsSkeleton />}

      {/* Empty state */}
      {!isLoading && sortedCategories.length === 0 && <EmptyState />}

      {/* Settings cards by category */}
      {!isLoading &&
        sortedCategories.length > 0 &&
        sortedCategories.map((category) => (
          <SettingsCard
            key={category}
            category={category}
            settings={grouped[category] ?? []}
            onSave={handleSave}
          />
        ))}
    </div>
  )
}
