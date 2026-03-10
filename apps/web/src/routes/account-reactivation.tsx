import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DestructiveConfirmDialog,
  Separator,
} from '@repo/ui'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { AlertTriangleIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { purgeAccount, reactivateAccount } from '@/lib/api'
import { appName } from '@/lib/appName'
import { authClient, useSession } from '@/lib/authClient'
import { m } from '@/paraglide/messages'

type ReactivationSearch = {
  deleteScheduledFor?: string
}

export const Route = createFileRoute('/account-reactivation')({
  component: AccountReactivationPage,
  validateSearch: (search: Record<string, unknown>): ReactivationSearch => ({
    deleteScheduledFor:
      typeof search.deleteScheduledFor === 'string' ? search.deleteScheduledFor : undefined,
  }),
  head: () => ({
    meta: [{ title: `${m.account_reactivation_title()} | ${appName}` }],
  }),
})

function useReactivation(navigate: ReturnType<typeof useNavigate>) {
  const [reactivating, setReactivating] = useState(false)

  async function handleReactivate() {
    setReactivating(true)
    try {
      const res = await reactivateAccount()
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null
        toast.error(data?.message ?? m.account_reactivation_error())
        return
      }
      toast.success(m.account_reactivation_success())
      navigate({ to: '/dashboard' })
    } catch {
      toast.error(m.account_reactivation_error())
    } finally {
      setReactivating(false)
    }
  }

  return { reactivating, handleReactivate }
}

function usePurge(navigate: ReturnType<typeof useNavigate>, email: string) {
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [purging, setPurging] = useState(false)

  async function handlePurge() {
    setPurging(true)
    try {
      const res = await purgeAccount(email)
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null
        toast.error(data?.message ?? m.account_purge_error())
        return
      }
      await authClient.signOut()
      navigate({ to: '/account-deleted', search: { purged: 'true' } })
    } catch {
      toast.error(m.account_purge_error())
    } finally {
      setPurging(false)
    }
  }

  return { purgeOpen, setPurgeOpen, purging, handlePurge }
}

function AccountReactivationPage() {
  const navigate = useNavigate()
  const { data: session } = useSession()
  const { deleteScheduledFor } = useSearch({ from: '/account-reactivation' })
  const { reactivating, handleReactivate } = useReactivation(navigate)
  const { purgeOpen, setPurgeOpen, purging, handlePurge } = usePurge(
    navigate,
    session?.user?.email ?? ''
  )

  const formattedDate = deleteScheduledFor
    ? new Date(deleteScheduledFor).toLocaleDateString()
    : null

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{m.account_reactivation_title()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangleIcon className="size-4" />
            <AlertTitle>{m.account_reactivation_deletion_pending()}</AlertTitle>
            <AlertDescription>
              {formattedDate
                ? m.account_reactivation_deleted_on({ date: formattedDate })
                : m.account_reactivation_scheduled()}
            </AlertDescription>
          </Alert>
          <p className="text-muted-foreground">{m.account_reactivation_description()}</p>
          {session?.user && (
            <p className="text-sm text-muted-foreground">
              {m.account_reactivation_signed_in_as()}{' '}
              <span className="font-medium">{session.user.email}</span>
            </p>
          )}
          <Button onClick={handleReactivate} disabled={reactivating} className="w-full">
            {reactivating ? m.account_reactivation_reactivating() : m.account_reactivation_button()}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            {m.account_reactivation_org_note()}
          </p>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive">
              {m.account_reactivation_permanent_title()}
            </p>
            <p className="text-sm text-muted-foreground">
              {m.account_reactivation_permanent_desc()}
            </p>
            <Button variant="destructive" size="sm" onClick={() => setPurgeOpen(true)}>
              {m.account_reactivation_delete_permanently()}
            </Button>
          </div>
          <DestructiveConfirmDialog
            open={purgeOpen}
            onOpenChange={(open: boolean) => {
              if (!open) setPurgeOpen(false)
            }}
            title={m.account_purge_confirm_title()}
            description={m.account_purge_confirm_desc()}
            confirmText={session?.user?.email ?? ''}
            confirmLabel={m.account_purge_confirm_label()}
            onConfirm={handlePurge}
            isLoading={purging}
          />
        </CardContent>
      </Card>
    </div>
  )
}
