import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './AlertDialog'
import { Input } from './Input'

export type DestructiveConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  impactSummary?: React.ReactNode
  confirmText: string
  confirmLabel?: string
  onConfirm: () => void
  isLoading?: boolean
  actionLabel?: string
  loadingLabel?: string
}

/**
 * Reusable destructive confirmation dialog.
 * Requires the user to type a confirmation text (case-insensitive) before enabling the action.
 * Used by both account deletion (#201) and organization deletion (#202).
 */
export function DestructiveConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  impactSummary,
  confirmText,
  confirmLabel,
  onConfirm,
  isLoading,
  actionLabel,
  loadingLabel,
}: DestructiveConfirmDialogProps) {
  const [input, setInput] = React.useState('')
  const safeConfirmText = confirmText ?? ''
  const isMatch = safeConfirmText !== '' && input.toLowerCase() === safeConfirmText.toLowerCase()

  // Reset input when dialog closes
  React.useEffect(() => {
    if (!open) setInput('')
  }, [open])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {impactSummary && <div className="py-2">{impactSummary}</div>}

        <div className="space-y-2 py-2">
          {confirmLabel && <p className="text-sm text-muted-foreground">{confirmLabel}</p>}
          <Input
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            placeholder={safeConfirmText}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!isMatch || isLoading}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isLoading ? (loadingLabel ?? 'Deleting...') : (actionLabel ?? 'Delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
