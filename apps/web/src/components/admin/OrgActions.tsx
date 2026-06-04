import type { OrgDeletionImpact } from '@repo/types'
import { Button, ConfirmDialog, DestructiveConfirmDialog } from '@repo/ui'
import { useQuery } from '@tanstack/react-query'
import { RotateCcwIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { fetchAdminOrgDeletionImpact } from '@/lib/admin/api'
import { useOrgMutations } from '@/lib/admin/mutations'
import { adminOrgKeys } from '@/lib/admin/queryKeys'
import { ImpactSummary } from './ImpactSummary'

type OrgActionsProps = {
  orgId: string
  orgName: string
  isArchived: boolean
  onActionComplete: () => void
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
    queryFn: async () => fetchAdminOrgDeletionImpact(orgId),
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
