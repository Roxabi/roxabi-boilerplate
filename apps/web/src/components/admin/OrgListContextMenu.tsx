import type { AdminOrganization, OrgDeletionImpact } from '@repo/types'
import {
  Button,
  ConfirmDialog,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DestructiveConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ExternalLinkIcon, MoreHorizontalIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { adminOrgKeys } from '@/lib/admin/queryKeys'

type OrgListContextMenuProps = {
  org: AdminOrganization
  onActionComplete: () => void
  children: React.ReactNode
}

type OrgListKebabButtonProps = {
  org: AdminOrganization
  onActionComplete: () => void
}

type OrgListMenuContentProps = {
  org: AdminOrganization
  onActionComplete: () => void
  variant: 'context' | 'dropdown'
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useOrgMenuMutations(orgId: string, orgName: string, onActionComplete: () => void) {
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
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
      const res = await fetch(`/api/admin/organizations/${orgId}/restore`, {
        method: 'POST',
        credentials: 'include',
      })
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

// ---------------------------------------------------------------------------
// ImpactSummary
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// OrgListMenuDialogs
// ---------------------------------------------------------------------------

type OrgListMenuDialogsProps = {
  org: AdminOrganization
  showDeleteDialog: boolean
  setShowDeleteDialog: (open: boolean) => void
  showRestoreDialog: boolean
  setShowRestoreDialog: (open: boolean) => void
  deleteMutation: ReturnType<typeof useOrgMenuMutations>['deleteMutation']
  restoreMutation: ReturnType<typeof useOrgMenuMutations>['restoreMutation']
}

function OrgListMenuDialogs({
  org,
  showDeleteDialog,
  setShowDeleteDialog,
  showRestoreDialog,
  setShowRestoreDialog,
  deleteMutation,
  restoreMutation,
}: OrgListMenuDialogsProps) {
  const { data: impact } = useQuery<OrgDeletionImpact>({
    queryKey: adminOrgKeys.deletionImpact(org.id),
    queryFn: async () => {
      const res = await fetch(`/api/admin/organizations/${org.id}/deletion-impact`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch deletion impact')
      return res.json()
    },
    enabled: showDeleteDialog,
    staleTime: 30_000,
  })

  return (
    <>
      <DestructiveConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={`Delete ${org.name}`}
        description="This action will soft-delete (archive) the organization. It can be reversed by restoring."
        impactSummary={impact ? <ImpactSummary orgName={org.name} impact={impact} /> : undefined}
        confirmText={org.name}
        confirmLabel={`Type "${org.name}" to confirm deletion`}
        onConfirm={() => {
          deleteMutation.mutate(undefined, { onSuccess: () => setShowDeleteDialog(false) })
        }}
        isLoading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        title={`Restore ${org.name}`}
        description={`Are you sure you want to restore ${org.name}? The organization and its members will be reactivated.`}
        variant="info"
        confirmText="Restore"
        onConfirm={() => {
          restoreMutation.mutate(undefined, { onSuccess: () => setShowRestoreDialog(false) })
        }}
        loading={restoreMutation.isPending}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// OrgListMenuContent
// ---------------------------------------------------------------------------

function OrgListMenuContent({ org, onActionComplete, variant }: OrgListMenuContentProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const { deleteMutation, restoreMutation } = useOrgMenuMutations(
    org.id,
    org.name,
    onActionComplete
  )

  const MenuItem = variant === 'context' ? ContextMenuItem : DropdownMenuItem
  const MenuSeparator = variant === 'context' ? ContextMenuSeparator : DropdownMenuSeparator

  return (
    <>
      <MenuItem asChild>
        <Link to="/admin/organizations/$orgId" params={{ orgId: org.id }}>
          <ExternalLinkIcon className="size-4" />
          View organization
        </Link>
      </MenuItem>

      <MenuSeparator />

      {org.deletedAt ? (
        <MenuItem
          onClick={(e) => {
            e.preventDefault()
            setShowRestoreDialog(true)
          }}
        >
          <RotateCcwIcon className="size-4" />
          Restore
        </MenuItem>
      ) : (
        <MenuItem
          variant="destructive"
          onClick={(e) => {
            e.preventDefault()
            setShowDeleteDialog(true)
          }}
        >
          <Trash2Icon className="size-4" />
          Delete
        </MenuItem>
      )}

      <OrgListMenuDialogs
        org={org}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        showRestoreDialog={showRestoreDialog}
        setShowRestoreDialog={setShowRestoreDialog}
        deleteMutation={deleteMutation}
        restoreMutation={restoreMutation}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// OrgListContextMenu
// ---------------------------------------------------------------------------

export function OrgListContextMenu({ org, onActionComplete, children }: OrgListContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <OrgListMenuContent org={org} onActionComplete={onActionComplete} variant="context" />
      </ContextMenuContent>
    </ContextMenu>
  )
}

// ---------------------------------------------------------------------------
// OrgListKebabButton
// ---------------------------------------------------------------------------

export function OrgListKebabButton({ org, onActionComplete }: OrgListKebabButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="More actions">
          <MoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <OrgListMenuContent org={org} onActionComplete={onActionComplete} variant="dropdown" />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
