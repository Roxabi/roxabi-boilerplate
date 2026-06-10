import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MailIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { roleLabel } from '@/lib/orgUtils'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { InvitationContextMenu, InvitationKebabButton } from './InvitationContextMenu'

type Invitation = {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
}

type InvitationsResponse = {
  data: Invitation[]
}

async function fetchInvitations(signal?: AbortSignal): Promise<Invitation[]> {
  const res = await fetch('/api/admin/invitations', {
    credentials: 'include',
    signal,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      typeof body === 'object' && body !== null && 'message' in body
        ? String(body.message)
        : 'Failed to fetch invitations'
    )
  }
  const json = (await res.json()) as InvitationsResponse
  return json.data ?? []
}

async function revokeInvitationApi(invitationId: string): Promise<void> {
  const res = await fetch(`/api/admin/invitations/${invitationId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error(m.auth_toast_error())
  }
}

// S7: Confirmation dialog for revoking invitations
type RevokeConfirmDialogProps = {
  invitation: { id: string; email: string } | null
  onConfirm: () => void
  onCancel: () => void
}

function RevokeConfirmDialog({ invitation, onConfirm, onCancel }: RevokeConfirmDialogProps) {
  return (
    <AlertDialog
      open={invitation !== null}
      onOpenChange={(open: boolean) => {
        if (!open) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.admin_invitations_revoke()}</AlertDialogTitle>
          <AlertDialogDescription>
            {m.org_members_remove_confirm()}{' '}
            <span className="font-medium text-foreground">{invitation?.email}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {m.admin_invitations_revoke()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function InvitationsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
        <div key={i} className="flex items-center gap-4 px-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

function InvitationsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <MailIcon className="size-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{m.admin_invitations_empty()}</p>
    </div>
  )
}

type InvitationsTableProps = {
  invitations: Invitation[]
  locale: string
  onRevoke: (invitation: { id: string; email: string }) => void
}

function InvitationsTable({ invitations, locale, onRevoke }: InvitationsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b text-left text-muted-foreground">
            <TableHead className="pb-2 pr-4 font-medium">{m.org_invitations_email()}</TableHead>
            <TableHead className="pb-2 pr-4 font-medium">{m.org_invitations_role()}</TableHead>
            <TableHead className="pb-2 pr-4 font-medium">{m.org_invitations_status()}</TableHead>
            <TableHead className="pb-2 pr-4 font-medium">{m.admin_invitations_expires()}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => (
            <InvitationContextMenu
              key={invitation.id}
              invitation={{ id: invitation.id, email: invitation.email }}
              onRevoke={onRevoke}
            >
              <TableRow className="border-b last:border-0">
                <TableCell className="py-3 pr-4">{invitation.email}</TableCell>
                <TableCell className="py-3 pr-4">
                  <Badge variant="outline">{roleLabel(invitation.role)}</Badge>
                </TableCell>
                <TableCell className="py-3 pr-4">
                  <Badge variant="secondary">{invitation.status}</Badge>
                </TableCell>
                <TableCell className="py-3 pr-4 text-muted-foreground">
                  {new Date(invitation.expiresAt).toLocaleDateString(locale)}
                </TableCell>
                <TableCell className="py-3">
                  <InvitationKebabButton
                    invitation={{ id: invitation.id, email: invitation.email }}
                    onRevoke={onRevoke}
                  />
                </TableCell>
              </TableRow>
            </InvitationContextMenu>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function PendingInvitations() {
  const queryClient = useQueryClient()
  const locale = getLocale()
  const [invitationToRevoke, setInvitationToRevoke] = useState<{
    id: string
    email: string
  } | null>(null)

  const invitationsQuery = useQuery({
    queryKey: ['admin-invitations'],
    queryFn: ({ signal }) => fetchInvitations(signal),
  })

  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) => revokeInvitationApi(invitationId),
    onSuccess: () => {
      toast.success(m.org_toast_invitation_revoked())
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] })
    },
    onError: () => toast.error(m.auth_toast_error()),
    onSettled: () => setInvitationToRevoke(null),
  })

  const invitations = invitationsQuery.data ?? []
  const { isLoading, isError } = invitationsQuery

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailIcon className="size-5" />
            {m.admin_invitations_title()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <InvitationsSkeleton />}
          {isError && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {m.admin_invitations_error()}
            </p>
          )}
          {!(isLoading || isError) && invitations.length === 0 && <InvitationsEmptyState />}
          {!(isLoading || isError) && invitations.length > 0 && (
            <InvitationsTable
              invitations={invitations}
              locale={locale}
              onRevoke={setInvitationToRevoke}
            />
          )}
        </CardContent>
      </Card>
      <RevokeConfirmDialog
        invitation={invitationToRevoke}
        onConfirm={() => invitationToRevoke && revokeMutation.mutate(invitationToRevoke.id)}
        onCancel={() => setInvitationToRevoke(null)}
      />
    </>
  )
}
