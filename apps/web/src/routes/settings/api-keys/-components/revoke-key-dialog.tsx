import { DestructiveConfirmDialog } from '@repo/ui'
import type { ApiKey } from '@/lib/apiKeys'
import { m } from '@/paraglide/messages'

function RevokeKeyDialog({
  open,
  onOpenChange,
  keyToRevoke,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  keyToRevoke: ApiKey | null
  onConfirm: () => void
}) {
  if (!keyToRevoke) return null

  return (
    <DestructiveConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={m.api_keys_revoke_title()}
      description={m.api_keys_revoke_description({ name: keyToRevoke.name })}
      confirmText={keyToRevoke.name}
      confirmLabel={m.api_keys_revoke_confirm_label()}
      onConfirm={onConfirm}
      actionLabel="Revoke"
      loadingLabel="Revoking..."
    />
  )
}

export { RevokeKeyDialog }
