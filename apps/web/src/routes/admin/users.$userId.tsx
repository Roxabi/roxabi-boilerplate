import type { AdminUserDetail, AuditLogEntry } from '@repo/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  BuildingIcon,
  CalendarIcon,
  LockIcon,
  MailIcon,
  PencilIcon,
  ShieldIcon,
  UserIcon,
  XIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { BackLink, DetailSkeleton } from '@/components/admin/DetailShared'
import { UserActions } from '@/components/admin/UserActions'
import { adminUserKeys } from '@/lib/admin/queryKeys'
import { appName } from '@/lib/appName'
import { useSession } from '@/lib/authClient'
import { formatDate, formatTimestamp } from '@/lib/formatDate'
import { enforceRoutePermission } from '@/lib/routePermissions'
import { statusLabel, statusVariant } from '@/lib/userStatus'

export const Route = createFileRoute('/admin/users/$userId')({
  staticData: { permission: 'role:superadmin' },
  beforeLoad: enforceRoutePermission,
  component: AdminUserDetailPage,
  head: () => ({ meta: [{ title: `User Detail | Admin | ${appName}` }] }),
})

function ProfileCard({ data }: { data: AdminUserDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="size-4" />
          Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileField icon={MailIcon} label="Email" value={data.email} />
          <div className="flex items-center gap-2">
            <ShieldIcon className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <Badge variant="outline" className="capitalize">
                {data.role ?? 'user'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-4" />
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={statusVariant(data)}>{statusLabel(data)}</Badge>
            </div>
          </div>
          <ProfileField icon={CalendarIcon} label="Created" value={formatDate(data.createdAt)} />
          <ProfileField icon={CalendarIcon} label="Updated" value={formatDate(data.updatedAt)} />
          {data.banned && data.banReason && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground">Ban reason</p>
              <p className="text-sm text-destructive">{data.banReason}</p>
              {data.banExpires && (
                <p className="text-xs text-muted-foreground mt-1">
                  Expires: {formatDate(data.banExpires)}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function MembershipsCard({ organizations }: { organizations: AdminUserDetail['organizations'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BuildingIcon className="size-4" />
          Organization Memberships
        </CardTitle>
      </CardHeader>
      <CardContent>
        {organizations.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No organization memberships
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Slug</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <Link
                      to="/admin/organizations/$orgId"
                      params={{ orgId: org.id }}
                      className="font-medium text-foreground hover:underline"
                    >
                      {org.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {org.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{org.slug ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityCard({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.slice(0, 10).map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatTimestamp(entry.timestamp)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {entry.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {entry.resource}
                  {entry.resourceId ? ` (${entry.resourceId.slice(0, 8)}...)` : ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

const ROLE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'superadmin', label: 'Super Admin' },
]

type EditUserFormProps = {
  user: AdminUserDetail
  currentUserId: string | undefined
  onSave: () => void
  onCancel: () => void
}

type UseEditUserMutationParams = {
  user: AdminUserDetail
  name: string
  email: string
  role: string
  isSelfDemotion: boolean
  onSave: () => void
}

function useEditUserMutation({
  user,
  name,
  email,
  role,
  isSelfDemotion,
  onSave,
}: UseEditUserMutationParams) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const mutation = useMutation({
    mutationFn: async (payload: { name: string; email: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        if (res.status === 409) {
          throw new Error(body?.message ?? 'A user with this email already exists')
        }
        throw new Error(body?.message ?? 'Failed to update user')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('User updated successfully')
      onSave()
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to update user')
      // Refetch user detail to update isLastActiveSuperadmin flag
      queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(user.id) })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (isSelfDemotion) {
      setShowConfirmDialog(true)
      return
    }

    mutation.mutate({ name, email, role })
  }

  function handleConfirmRoleChange() {
    setShowConfirmDialog(false)
    mutation.mutate({ name, email, role })
  }

  return {
    mutation,
    error,
    showConfirmDialog,
    setShowConfirmDialog,
    handleSubmit,
    handleConfirmRoleChange,
  }
}

function RoleField({
  isRoleLocked,
  role,
  currentRole,
  onValueChange,
}: {
  isRoleLocked: boolean
  role: string
  currentRole: string | null
  onValueChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="edit-role" className="text-sm font-medium">
        Global Role
      </Label>
      {isRoleLocked ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <output
              aria-label="You are the last active superadmin and cannot change your role."
              className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground cursor-not-allowed"
            >
              <LockIcon className="size-3.5" />
              <span className="capitalize">{currentRole}</span>
            </output>
          </TooltipTrigger>
          <TooltipContent>
            You are the last active superadmin and cannot change your role.
          </TooltipContent>
        </Tooltip>
      ) : (
        <Select value={role} onValueChange={onValueChange}>
          <SelectTrigger id="edit-role" className="w-full">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

function buildConfirmDescription(role: string, orgOwnerNames: string[]) {
  const targetLabel = ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role
  return (
    <>
      <p>
        You are about to change your role from Super Admin to {targetLabel}. You will lose access to
        the admin panel and will be logged out on all devices. Another superadmin will need to
        restore your access.
      </p>
      {orgOwnerNames.length > 0 && (
        <p className="mt-2">
          Note: You are still an owner in {orgOwnerNames.join(', ')}. Your organization ownership is
          not affected, but you won&apos;t be able to manage these organizations from the admin
          panel.
        </p>
      )}
    </>
  )
}

function EditUserForm({ user, currentUserId, onSave, onCancel }: EditUserFormProps) {
  const [name, setName] = useState(user.name || '')
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role ?? 'user')

  const isSelf = currentUserId === user.id
  const isSelfSuperadmin = isSelf && user.role === 'superadmin'
  const isRoleLocked = isSelfSuperadmin && user.isLastActiveSuperadmin
  const isSelfDemotion = isSelfSuperadmin && role !== 'superadmin'

  const {
    mutation,
    error,
    showConfirmDialog,
    setShowConfirmDialog,
    handleSubmit,
    handleConfirmRoleChange,
  } = useEditUserMutation({ user, name, email, role, isSelfDemotion, onSave })

  const ownerOrgNames = user.organizations.filter((o) => o.role === 'owner').map((o) => o.name)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PencilIcon className="size-4" />
            Edit User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive rounded-md border border-destructive/20 bg-destructive/5 p-3">
                {error}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="User name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <RoleField
                isRoleLocked={isRoleLocked}
                role={role}
                currentRole={user.role}
                onValueChange={setRole}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={mutation.isPending}>
                Save Changes
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Change Your Role"
        description={buildConfirmDescription(role, ownerOrgNames)}
        variant="warning"
        confirmText="Change Role"
        onConfirm={handleConfirmRoleChange}
        loading={mutation.isPending}
      />
    </>
  )
}

type UserDetailHeaderProps = {
  data: AdminUserDetail
  isEditing: boolean
  onEditToggle: (editing: boolean) => void
  onActionComplete: () => void
}

function UserDetailHeader({
  data,
  isEditing,
  onEditToggle,
  onActionComplete,
}: UserDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{data.name || 'Unnamed User'}</h1>
        <p className="text-sm text-muted-foreground">{data.email}</p>
      </div>
      <div className="flex items-center gap-2">
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditToggle(true)}
            className="gap-1.5"
          >
            <PencilIcon className="size-3.5" />
            Edit
          </Button>
        )}
        {isEditing && (
          <Button variant="ghost" size="sm" onClick={() => onEditToggle(false)} className="gap-1.5">
            <XIcon className="size-3.5" />
            Cancel Edit
          </Button>
        )}
        <UserActions
          userId={data.id}
          userName={data.name || data.email}
          isBanned={Boolean(data.banned)}
          isArchived={Boolean(data.deletedAt)}
          onActionComplete={onActionComplete}
        />
      </div>
    </div>
  )
}

function AdminUserDetailPage() {
  const { userId } = Route.useParams()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const [isEditing, setIsEditing] = useState(false)

  const { data, isLoading, error } = useQuery<AdminUserDetail>({
    queryKey: adminUserKeys.detail(userId),
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}`)
      if (!res.ok) throw new Error('User not found')
      return res.json()
    },
  })

  function handleActionComplete() {
    queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(userId) })
    queryClient.invalidateQueries({ queryKey: adminUserKeys.all })
  }

  function handleEditSave() {
    setIsEditing(false)
    handleActionComplete()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <BackLink to="/admin/users" label="Back to Users" />
        <DetailSkeleton />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <BackLink to="/admin/users" label="Back to Users" />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'User not found'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackLink to="/admin/users" label="Back to Users" />
      <UserDetailHeader
        data={data}
        isEditing={isEditing}
        onEditToggle={setIsEditing}
        onActionComplete={handleActionComplete}
      />
      {isEditing && (
        <EditUserForm
          user={data}
          currentUserId={session?.user?.id}
          onSave={handleEditSave}
          onCancel={() => setIsEditing(false)}
        />
      )}
      <ProfileCard data={data} />
      <MembershipsCard organizations={data.organizations} />
      {data.activitySummary && <ActivityCard entries={data.activitySummary} />}
    </div>
  )
}
