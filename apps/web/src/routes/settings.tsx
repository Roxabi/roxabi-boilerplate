import { cn } from '@repo/ui'
import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { hasPermission } from '@/lib/permissions'
import { requireAuth } from '@/lib/routeGuards'
import { useEnrichedSession } from '@/lib/routePermissions'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/settings')({
  beforeLoad: requireAuth,
  component: SettingsLayout,
})

type SettingsTab = {
  to: string
  label: () => string
  match: (pathname: string) => boolean
  visible?: boolean
}

function SettingsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { data: session } = useEnrichedSession()

  const canReadApiKeys = hasPermission(session, 'api_keys:read')

  const tabs: SettingsTab[] = [
    {
      to: '/settings/profile',
      label: () => m.settings_tab_profile(),
      match: (p) => p.includes('/settings/profile') || p === '/settings',
    },
    {
      to: '/settings/account',
      label: () => m.settings_tab_account(),
      match: (p) => p.includes('/settings/account'),
    },
    {
      to: '/settings/apiKeys',
      label: () => m.settings_tab_api_keys(),
      match: (p) => p.includes('/settings/apiKeys'),
      visible: canReadApiKeys,
    },
  ]

  const visibleTabs = tabs.filter((tab) => tab.visible !== false)

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">{m.settings_title()}</h1>
      <nav className="flex gap-2 border-b pb-2" aria-label={m.settings_nav_label()}>
        {visibleTabs.map((tab) => {
          const isActive = tab.match(pathname)
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label()}
            </Link>
          )
        })}
      </nav>
      <Outlet />
    </div>
  )
}
