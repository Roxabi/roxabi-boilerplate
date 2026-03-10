import { Button, Card, CardContent, CardHeader, CardTitle } from '@repo/ui'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { BookOpenIcon, SettingsIcon, UsersIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { fetchUserProfile } from '@/lib/api'
import { appName } from '@/lib/appName'
import { authClient, useSession } from '@/lib/authClient'
import { requireAuth } from '@/lib/routeGuards'
import { useOrganizations } from '@/lib/useOrganizations'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: requireAuth,
  component: DashboardPage,
  head: () => ({
    meta: [{ title: `Dashboard | ${appName}` }],
  }),
})

// ---------------------------------------------------------------------------
// Custom hooks for dashboard
// ---------------------------------------------------------------------------

function useAccountDeletionCheck(navigate: ReturnType<typeof useNavigate>) {
  const accountCheckDone = useRef(false)
  const [accountChecked, setAccountChecked] = useState(false)

  useEffect(() => {
    if (accountCheckDone.current) {
      setAccountChecked(true)
      return
    }

    const controller = new AbortController()
    async function checkAccountStatus() {
      try {
        const res = await fetchUserProfile(controller.signal)
        if (!res.ok) return
        const profile = (await res.json()) as Record<string, unknown>
        if (profile.deletedAt) {
          navigate({
            to: '/account-reactivation',
            search: { deleteScheduledFor: profile.deleteScheduledFor as string | undefined },
          })
        }
      } catch {
        // Non-blocking: profile check is best-effort
      } finally {
        if (!controller.signal.aborted) {
          accountCheckDone.current = true
          setAccountChecked(true)
        }
      }
    }
    checkAccountStatus()
    return () => controller.abort()
  }, [navigate])

  return accountChecked
}

function useAutoSelectOrg(
  accountChecked: boolean,
  activeOrg: { id: string } | null | undefined,
  orgs: Array<{ id: string }> | undefined
) {
  const autoSelectAttempted = useRef(false)
  const prevOrgsLength = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!(accountChecked && orgs)) return

    if (prevOrgsLength.current !== undefined && prevOrgsLength.current !== orgs.length) {
      autoSelectAttempted.current = false
    }
    prevOrgsLength.current = orgs.length

    if (autoSelectAttempted.current) return
    const activeOrgValid = activeOrg && orgs.some((org) => org.id === activeOrg.id)
    if (activeOrgValid) return
    const firstOrg = orgs[0]
    autoSelectAttempted.current = true
    if (firstOrg) {
      authClient.organization.setActive({ organizationId: firstOrg.id }).catch(() => {})
    } else if (activeOrg) {
      authClient.organization.setActive({ organizationId: '' }).catch(() => {})
    }
  }, [accountChecked, activeOrg, orgs])
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="h-32 animate-pulse rounded-lg bg-muted" />
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  )
}

type QuickActionCardProps = {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  linkTo: string
  linkParams?: Record<string, string>
  linkLabel: string
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  linkTo,
  linkParams,
  linkLabel,
}: QuickActionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">{description}</p>
        <Button variant="outline" size="sm" asChild>
          <Link to={linkTo} params={linkParams}>
            {linkLabel}
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

function DashboardPage() {
  const { data: session } = useSession()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const { data: orgs, isLoading: orgsLoading } = useOrganizations(session?.user?.id)
  const navigate = useNavigate()

  const accountChecked = useAccountDeletionCheck(navigate)
  useAutoSelectOrg(accountChecked, activeOrg, orgs)

  if (!session || orgsLoading) return <DashboardSkeleton />

  const userName = session?.user?.name ?? 'User'

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{m.dashboard_welcome({ name: userName })}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {activeOrg ? m.dashboard_org_context({ name: activeOrg.name }) : m.dashboard_no_org()}
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">{m.dashboard_quick_actions()}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            icon={SettingsIcon}
            title={m.dashboard_org_settings()}
            description={m.dashboard_org_settings_desc()}
            linkTo="/admin/settings"
            linkLabel={m.dashboard_open_settings()}
          />
          <QuickActionCard
            icon={UsersIcon}
            title={m.dashboard_team_members()}
            description={m.dashboard_team_members_desc()}
            linkTo="/admin/members"
            linkLabel={m.dashboard_view_members()}
          />
          <QuickActionCard
            icon={BookOpenIcon}
            title={m.dashboard_documentation()}
            description={m.dashboard_documentation_desc()}
            linkTo="/docs/$"
            linkParams={{ _splat: '' }}
            linkLabel={m.dashboard_read_docs()}
          />
        </div>
      </div>
    </div>
  )
}
