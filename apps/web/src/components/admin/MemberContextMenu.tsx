import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ExternalLinkIcon,
  LoaderIcon,
  MoreHorizontalIcon,
  PencilIcon,
  ShieldIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { adminOrgKeys } from '@/lib/admin/queryKeys'
import type { OrgRole } from './types'

export type MemberForMenu = {
  id: string
  userId: string
  name: string
  email: string
  role: string
  roleId: string | null
}

type MemberContextMenuProps = {
  member: MemberForMenu
  orgId: string
  currentUserId: string
  onActionComplete: () => void
  children: React.ReactNode
}

export type MemberKebabButtonProps = {
  member: MemberForMenu
  orgId: string
  currentUserId: string
  onActionComplete: () => void
}

type MemberMenuContentProps = {
  member: MemberForMenu
  orgId: string
  currentUserId: string
  onActionComplete: () => void
  variant: 'context' | 'dropdown'
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useOrgRoles(orgId: string) {
  return useQuery<{ data: OrgRole[] }>({
    queryKey: adminOrgKeys.roles(orgId),
    queryFn: async () => {
      const res = await fetch(`/api/admin/organizations/${orgId}/roles`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load roles')
      return res.json()
    },
  })
}

function useChangeRoleMutation(orgId: string, memberId: string, onActionComplete: () => void) {
  return useMutation({
    mutationFn: async (roleId: string) => {
      const res = await fetch(`/api/admin/organizations/${orgId}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        if (res.status === 400) {
          throw new Error(
            body?.message ?? 'Cannot change role: this is the last owner of the organization'
          )
        }
        throw new Error(body?.message ?? 'Failed to change role')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Role updated successfully')
      onActionComplete()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to change role')
    },
  })
}

function useEditProfileMutation(
  userId: string,
  onSuccess: () => void,
  setError: (e: string | null) => void
) {
  return useMutation({
    mutationFn: async (payload: { name: string; email: string }) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        if (res.status === 409) {
          throw new Error(body?.message ?? 'A user with this email already exists')
        }
        if (res.status === 404) {
          throw new Error(body?.message ?? 'User not found')
        }
        throw new Error(body?.message ?? 'Failed to update profile')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Profile updated successfully')
      onSuccess()
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      if (message.includes('email already exists')) {
        setError(message)
      } else {
        toast.error(message)
      }
    },
  })
}

// ---------------------------------------------------------------------------
// EditProfileDialog
// ---------------------------------------------------------------------------

type EditProfileDialogProps = {
  member: MemberForMenu
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionComplete: () => void
}

function EditProfileDialog({
  member,
  open,
  onOpenChange,
  onActionComplete,
}: EditProfileDialogProps) {
  const [name, setName] = useState(member.name)
  const [email, setEmail] = useState(member.email)
  const [error, setError] = useState<string | null>(null)

  function handleSuccess() {
    onOpenChange(false)
    onActionComplete()
  }

  const mutation = useEditProfileMutation(member.userId, handleSuccess, setError)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    mutation.mutate({ name, email })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setName(member.name)
      setEmail(member.email)
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update the name and email for {member.name || 'this member'}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="edit-member-name">Name</Label>
            <Input
              id="edit-member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-member-email">Email</Label>
            <Input
              id="edit-member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// RoleSubmenuItems
// ---------------------------------------------------------------------------

type RoleSubmenuItemsProps = {
  orgId: string
  member: MemberForMenu
  currentUserId: string
  onActionComplete: () => void
  variant: 'context' | 'dropdown'
}

function RoleSubmenuItems({
  orgId,
  member,
  currentUserId,
  onActionComplete,
  variant,
}: RoleSubmenuItemsProps) {
  const { data: rolesData, isLoading, isError } = useOrgRoles(orgId)
  const changeRole = useChangeRoleMutation(orgId, member.id, onActionComplete)

  const roles = rolesData?.data ?? []
  const isSelf = member.userId === currentUserId

  const MenuItem = variant === 'context' ? ContextMenuItem : DropdownMenuItem

  useEffect(() => {
    if (isError) toast.error('Failed to load roles')
  }, [isError])

  if (isLoading) {
    return (
      <MenuItem disabled>
        <LoaderIcon className="size-4 animate-spin" />
        Loading roles...
      </MenuItem>
    )
  }

  if (isError) {
    return <MenuItem disabled>Failed to load roles</MenuItem>
  }

  if (roles.length === 0) {
    return <MenuItem disabled>No roles configured for this organization</MenuItem>
  }

  return (
    <>
      {roles.map((role) => {
        const isCurrent = role.id === member.roleId
        return (
          <MenuItem
            key={role.id}
            disabled={isSelf || isCurrent || changeRole.isPending}
            onClick={() => {
              if (!(isSelf || isCurrent)) {
                changeRole.mutate(role.id)
              }
            }}
          >
            <span className="flex items-center gap-2">
              {isCurrent ? (
                <span className="text-xs font-medium text-muted-foreground">(current)</span>
              ) : null}
              {role.name}
            </span>
          </MenuItem>
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------------------
// MemberMenuContent
// ---------------------------------------------------------------------------

function MemberMenuContent({
  member,
  orgId,
  currentUserId,
  onActionComplete,
  variant,
}: MemberMenuContentProps) {
  const [editOpen, setEditOpen] = useState(false)
  const isSelf = member.userId === currentUserId

  const SubMenu = variant === 'context' ? ContextMenuSub : DropdownMenuSub
  const SubTrigger = variant === 'context' ? ContextMenuSubTrigger : DropdownMenuSubTrigger
  const SubContent = variant === 'context' ? ContextMenuSubContent : DropdownMenuSubContent
  const MenuItem = variant === 'context' ? ContextMenuItem : DropdownMenuItem
  const MenuSeparator = variant === 'context' ? ContextMenuSeparator : DropdownMenuSeparator

  return (
    <>
      {isSelf ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <SubMenu>
                  <SubTrigger disabled>
                    <ShieldIcon className="size-4" />
                    Change role
                  </SubTrigger>
                </SubMenu>
              </div>
            </TooltipTrigger>
            <TooltipContent>Cannot change your own role</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <SubMenu>
          <SubTrigger>
            <ShieldIcon className="size-4" />
            Change role
          </SubTrigger>
          <SubContent>
            <RoleSubmenuItems
              orgId={orgId}
              member={member}
              currentUserId={currentUserId}
              onActionComplete={onActionComplete}
              variant={variant}
            />
          </SubContent>
        </SubMenu>
      )}

      <MenuItem
        onClick={(e) => {
          e.preventDefault()
          setEditOpen(true)
        }}
      >
        <PencilIcon className="size-4" />
        Edit profile
      </MenuItem>

      <MenuSeparator />

      <MenuItem asChild>
        <Link to="/admin/users/$userId" params={{ userId: member.userId }}>
          <ExternalLinkIcon className="size-4" />
          View user
        </Link>
      </MenuItem>

      <EditProfileDialog
        member={member}
        open={editOpen}
        onOpenChange={setEditOpen}
        onActionComplete={onActionComplete}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// MemberContextMenu
// ---------------------------------------------------------------------------

export function MemberContextMenu({
  member,
  orgId,
  currentUserId,
  onActionComplete,
  children,
}: MemberContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <MemberMenuContent
          member={member}
          orgId={orgId}
          currentUserId={currentUserId}
          onActionComplete={onActionComplete}
          variant="context"
        />
      </ContextMenuContent>
    </ContextMenu>
  )
}

// ---------------------------------------------------------------------------
// MemberKebabButton
// ---------------------------------------------------------------------------

export function MemberKebabButton({
  member,
  orgId,
  currentUserId,
  onActionComplete,
}: MemberKebabButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="More actions">
          <MoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <MemberMenuContent
          member={member}
          orgId={orgId}
          currentUserId={currentUserId}
          onActionComplete={onActionComplete}
          variant="dropdown"
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
