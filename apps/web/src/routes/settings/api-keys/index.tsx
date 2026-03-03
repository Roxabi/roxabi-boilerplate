import { createFileRoute } from '@tanstack/react-router'
import { authClient } from '@/lib/authClient'
import { hasPermission } from '@/lib/permissions'
import {
  enforceRoutePermission,
  enrichedSessionKeys,
  useEnrichedSession,
} from '@/lib/routePermissions'
import { ApiKeyListContent } from './-components/api-key-list-content'
import { CreateKeyDialog } from './-components/create-key-dialog'
import { ErrorState } from './-components/error-state'
import { LoadingSkeleton } from './-components/loading-skeleton'
import { NoOrgMessage } from './-components/no-org-message'
import { NoPermissionMessage } from './-components/no-permission-message'
import { OneTimeKeyDisplay } from './-components/one-time-key-display'
import { RevokeKeyDialog } from './-components/revoke-key-dialog'
import { useApiKeyDialogs, useApiKeys } from './-hooks'

export const Route = createFileRoute('/settings/api-keys/')({
  staticData: { permission: 'api_keys:read' },
  beforeLoad: async (ctx) => {
    await enforceRoutePermission(ctx)
    // Prime the React Query cache with the session already fetched by the root beforeLoad.
    // Uses ensureQueryData (not setQueryData) so the value is included in the SSR dehydration
    // snapshot and hydrated on the client without an extra /api/session network request.
    await ctx.context.queryClient.ensureQueryData({
      queryKey: enrichedSessionKeys.all,
      queryFn: () => Promise.resolve(ctx.context.session ?? null),
      staleTime: 30_000,
    })
  },
  component: ApiKeysSettingsPage,
  head: () => ({
    meta: [{ title: 'API Keys | Settings | Roxabi' }],
  }),
})

function ApiKeysSettingsPage() {
  // useEnrichedSession fetches from /api/session which includes the RBAC permissions array.
  // The standard better-auth useSession() does not include permissions, so hasPermission()
  // would always return false with that hook.
  const { data: enrichedSession } = useEnrichedSession()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const canRead = hasPermission(enrichedSession, 'api_keys:read')
  const canWrite = hasPermission(enrichedSession, 'api_keys:write')
  const { keys, loading, error, updateKeyLocally, addKeyLocally } = useApiKeys(activeOrg?.id)
  const dialogs = useApiKeyDialogs(addKeyLocally, updateKeyLocally)

  // Show skeleton while enriched session is loading (permissions not yet available)
  if (!enrichedSession) return <LoadingSkeleton />
  if (!activeOrg) return <NoOrgMessage />
  // enrichedSession is non-null from here — permissions is string[] (non-optional)
  const userPermissions = enrichedSession.permissions
  if (!canRead) return <NoPermissionMessage />
  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState error={error} />

  return (
    <div className="space-y-6">
      <ApiKeyListContent
        keys={keys}
        canWrite={canWrite}
        onCreateClick={() => dialogs.setCreateOpen(true)}
        onRevokeClick={dialogs.handleRevokeClick}
      />
      <CreateKeyDialog
        open={dialogs.createOpen}
        onOpenChange={dialogs.setCreateOpen}
        availablePermissions={userPermissions}
        onCreated={dialogs.handleCreateSuccess}
      />
      <OneTimeKeyDisplay
        open={dialogs.oneTimeOpen}
        onOpenChange={dialogs.handleOneTimeClose}
        createdKey={dialogs.oneTimeKey}
      />
      <RevokeKeyDialog
        open={dialogs.revokeOpen}
        onOpenChange={dialogs.handleRevokeClose}
        keyToRevoke={dialogs.revokeTarget}
        onConfirm={dialogs.handleRevokeConfirm}
      />
    </div>
  )
}
