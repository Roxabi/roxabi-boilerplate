import type { OrgDeletionImpact } from '@repo/types'
import { Button, ConfirmDialog, DestructiveConfirmDialog } from '@repo/ui'
import { useMutation, useQuery } from '@tanstack/react-query'
import { RotateCcwIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { adminOrgKeys } from '@/lib/admin/queryKeys'

type OrgActionsProps = {
  orgId: string
  orgName: string
  isArchived: boolean
  onActionComplete: () => void
}

function useOrgMutations(orgId: string, orgName: string, onActionComplete: () => void) {
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/organizations/${orgId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete organization')
    },
    onSuccess: () => {
      toast.success(`${orgName} has been archived`)
      onActionComplete()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete organization')
    },
  })

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/organizations/${orgId}/restore`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to restore organization')
    },
    onSuccess: () => {
      toast.success(`${orgName} has been restored`)
      onActionComplete()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to restore organization')
    },
  })

  return { deleteMutation, restoreMutation }
}

function ImpactSummary({ orgName, impact }: { orgName: string; impact: OrgDeletionImpact }) {
  const childMsg = `${impact.childMemberCount} member${impact.childMemberCount !== 1 ? 's' : ''} across ${impact.childOrgCount} child org${impact.childOrgCount !== 1 ? 's' : ''} will be affected`

  return (
    <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm">
      <p>
        This will archive <strong>{orgName}</strong>.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        <li>
          {impact.memberCount} member{impact.memberCount !== 1 ? 's' : ''} will be affected
        </li>
        {impact.childOrgCount > 0 && <li>{childMsg}</li>}
      </ul>
    </div>
  )
}

function ActionButton({
  isArchived,
  onDelete,
  onRestore,
  restorePending,
}: {
  isArchived: boolean
  onDelete: () => void
  onRestore: () => void
  restorePending: boolean
}) {
  if (isArchived) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onRestore}
        loading={restorePending}
        className="gap-1.5"
      >
        <RotateCcwIcon className="size-3.5" />
        Restore
      </Button>
    )
  }
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onDelete}
      className="gap-1.5 text-destructive hover:text-destructive"
    >
      <Trash2Icon className="size-3.5" />
      Delete
    </Button>
  )
}

/**
 * OrgActions -- action buttons and dialogs for organization detail page.
 *
 * Renders contextual action buttons: Delete (with impact preview), Restore.
 */
export function OrgActions({ orgId, orgName, isArchived, onActionComplete }: OrgActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const { deleteMutation, restoreMutation } = useOrgMutations(orgId, orgName, onActionComplete)

  const { data: impact } = useQuery<OrgDeletionImpact>({
    queryKey: adminOrgKeys.deletionImpact(orgId),
    queryFn: async () => {
      const res = await fetch(`/api/admin/organizations/${orgId}/deletion-impact`)
      if (!res.ok) throw new Error('Failed to fetch deletion impact')
      return res.json()
    },
    enabled: showDeleteDialog,
  })

  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton
        isArchived={isArchived}
        onDelete={() => setShowDeleteDialog(true)}
        onRestore={() => setShowRestoreDialog(true)}
        restorePending={restoreMutation.isPending}
      />

      <DestructiveConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={`Delete ${orgName}`}
        description="This action will soft-delete (archive) the organization. It can be reversed by restoring."
        impactSummary={impact ? <ImpactSummary orgName={orgName} impact={impact} /> : undefined}
        confirmText={orgName}
        confirmLabel={`Type "${orgName}" to confirm deletion`}
        onConfirm={() => {
          deleteMutation.mutate(undefined, { onSuccess: () => setShowDeleteDialog(false) })
        }}
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        title={`Restore ${orgName}`}
        description={`Are you sure you want to restore ${orgName}? The organization and its members will be reactivated.`}
        variant="info"
        confirmText="Restore"
        onConfirm={() => {
          restoreMutation.mutate(undefined, { onSuccess: () => setShowRestoreDialog(false) })
        }}
        loading={restoreMutation.isPending}
      />
    </div>
  )
}
