import { Button, ConfirmDialog, DestructiveConfirmDialog } from '@repo/ui'
import { BanIcon, RotateCcwIcon, ShieldCheckIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { useUserMutations } from '@/lib/admin/mutations'
import { BanDialog } from './BanDialog'

type UserActionsProps = {
  userId: string
  userName: string
  isBanned: boolean
  isArchived: boolean
  onActionComplete: () => void
}

type ActionButtonsProps = {
  isBanned: boolean
  isArchived: boolean
  onBanClick: () => void
  onUnban: () => void
  onDelete: () => void
  onRestore: () => void
  unbanPending: boolean
  deletePending: boolean
  restorePending: boolean
}

function ActionButtons({
  isBanned,
  isArchived,
  onBanClick,
  onUnban,
  onDelete,
  onRestore,
  unbanPending,
  deletePending,
  restorePending,
}: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {isBanned ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onUnban}
          loading={unbanPending}
          className="gap-1.5"
        >
          <ShieldCheckIcon className="size-3.5" />
          Unban
        </Button>
      ) : (
        !isArchived && (
          <Button variant="destructive" size="sm" onClick={onBanClick} className="gap-1.5">
            <BanIcon className="size-3.5" />
            Ban
          </Button>
        )
      )}
      {isArchived ? (
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
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          loading={deletePending}
          className="gap-1.5 text-destructive hover:text-destructive"
        >
          <Trash2Icon className="size-3.5" />
          Delete
        </Button>
      )}
    </div>
  )
}

/**
 * UserActions — action buttons and dialogs for user detail page.
 *
 * Renders contextual action buttons: Ban/Unban, Delete/Restore.
 * Each destructive action shows a confirmation dialog.
 */
export function UserActions({
  userId,
  userName,
  isBanned,
  isArchived,
  onActionComplete,
}: UserActionsProps) {
  const [showBanDialog, setShowBanDialog] = useState(false)
  const [showUnbanDialog, setShowUnbanDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const mutations = useUserMutations(userId, userName, onActionComplete)

  return (
    <div className="space-y-3">
      <ActionButtons
        isBanned={isBanned}
        isArchived={isArchived}
        onBanClick={() => setShowBanDialog(true)}
        onUnban={() => setShowUnbanDialog(true)}
        onDelete={() => setShowDeleteDialog(true)}
        onRestore={() => setShowRestoreDialog(true)}
        unbanPending={mutations.unbanMutation.isPending}
        deletePending={mutations.deleteMutation.isPending}
        restorePending={mutations.restoreMutation.isPending}
      />
      <BanDialog
        open={showBanDialog}
        onOpenChange={setShowBanDialog}
        userName={userName}
        isPending={mutations.banMutation.isPending}
        onSubmit={(reason, expires) =>
          mutations.banMutation.mutate(
            { reason, expires },
            { onSuccess: () => setShowBanDialog(false) }
          )
        }
      />
      <ConfirmDialog
        open={showUnbanDialog}
        onOpenChange={setShowUnbanDialog}
        title={`Unban ${userName}`}
        description={`Are you sure you want to unban ${userName}? They will regain access to their account.`}
        variant="info"
        confirmText="Unban"
        onConfirm={() =>
          mutations.unbanMutation.mutate(undefined, { onSuccess: () => setShowUnbanDialog(false) })
        }
        loading={mutations.unbanMutation.isPending}
      />
      <DestructiveConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={`Delete ${userName}`}
        description="This action will soft-delete (archive) the user. It can be reversed by restoring."
        confirmText={userName}
        confirmLabel={`Type "${userName}" to confirm deletion`}
        onConfirm={() =>
          mutations.deleteMutation.mutate(undefined, {
            onSuccess: () => setShowDeleteDialog(false),
          })
        }
        isLoading={mutations.deleteMutation.isPending}
      />
      <ConfirmDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        title={`Restore ${userName}`}
        description={`Are you sure you want to restore ${userName}? The user account will be reactivated.`}
        variant="info"
        confirmText="Restore"
        onConfirm={() =>
          mutations.restoreMutation.mutate(undefined, {
            onSuccess: () => setShowRestoreDialog(false),
          })
        }
        loading={mutations.restoreMutation.isPending}
      />
    </div>
  )
}
