import type { AdminOrganization, AdminOrgDetail } from '@repo/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BuildingIcon, CalendarIcon, NetworkIcon, PencilIcon, UsersIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { BackLink, DetailSkeleton } from '@/components/admin/DetailShared'
import { MemberContextMenu, MemberKebabButton } from '@/components/admin/MemberContextMenu'
import { OrgActions } from '@/components/admin/OrgActions'
import { adminOrgKeys } from '@/lib/admin/queryKeys'
import { useSession } from '@/lib/authClient'
import { formatDate } from '@/lib/formatDate'
import { enforceRoutePermission } from '@/lib/routePermissions'

export const Route = createFileRoute('/admin/organizations/$orgId')({
  staticData: { permission: 'role:superadmin' },
  beforeLoad: enforceRoutePermission,
  component: AdminOrgDetailPage,
  head: () => ({ meta: [{ title: 'Organization Detail | Admin | Roxabi' }] }),
})

function ProfileField({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {children ?? <p className="text-sm font-medium">{value}</p>}
      </div>
    </div>
  )
}

function ProfileCard({ data }: { data: AdminOrgDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BuildingIcon className="size-4" />
          Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileField icon={BuildingIcon} label="Name" value={data.name} />
          <ProfileField icon={BuildingIcon} label="Slug" value={data.slug ?? '-'} />
          <ProfileField icon={NetworkIcon} label="Parent Organization">
            {data.parentOrganization ? (
              <Link
                to="/admin/organizations/$orgId"
                params={{ orgId: data.parentOrganization.id }}
                className="text-sm font-medium hover:underline"
              >
                {data.parentOrganization.name}
              </Link>
            ) : (
              <p className="text-sm font-medium">None (top-level)</p>
            )}
          </ProfileField>
          <div className="flex items-center gap-2">
            <div className="size-4" />
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={data.deletedAt ? 'secondary' : 'default'}>
                {data.deletedAt ? 'Archived' : 'Active'}
              </Badge>
            </div>
          </div>
          <ProfileField icon={CalendarIcon} label="Created" value={formatDate(data.createdAt)} />
          <ProfileField icon={CalendarIcon} label="Updated" value={formatDate(data.updatedAt)} />
        </div>
      </CardContent>
    </Card>
  )
}

function MembersCard({
  members,
  orgId,
  currentUserId,
  onActionComplete,
}: {
  members: AdminOrgDetail['members']
  orgId: string
  currentUserId: string
  onActionComplete: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon className="size-4" />
          Members ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No members</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const memberForMenu = {
                  id: member.id,
                  userId: member.userId,
                  name: member.name,
                  email: member.email,
                  role: member.role,
                  roleId: member.roleId,
                }
                return (
                  <MemberContextMenu
                    key={member.id}
                    member={memberForMenu}
                    orgId={orgId}
                    currentUserId={currentUserId}
                    onActionComplete={onActionComplete}
                  >
                    <TableRow>
                      <TableCell className="font-medium">{member.name || 'Unnamed'}</TableCell>
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(member.createdAt)}
                      </TableCell>
                      <TableCell>
                        <MemberKebabButton
                          member={memberForMenu}
                          orgId={orgId}
                          currentUserId={currentUserId}
                          onActionComplete={onActionComplete}
                        />
                      </TableCell>
                    </TableRow>
                  </MemberContextMenu>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function ChildOrgsCard({ childOrgs }: { childOrgs: AdminOrgDetail['children'] }) {
  if (childOrgs.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NetworkIcon className="size-4" />
          Child Organizations ({childOrgs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Members</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {childOrgs.map((child) => (
              <TableRow key={child.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link
                    to="/admin/organizations/$orgId"
                    params={{ orgId: child.id }}
                    className="font-medium text-foreground hover:underline"
                  >
                    {child.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{child.slug ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{child.memberCount}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

type EditOrgFormProps = {
  org: AdminOrgDetail
  onSave: () => void
  onCancel: () => void
}

const NONE_SENTINEL = '__none__'

function useOrgEditMutation(
  orgId: string,
  onSave: () => void,
  setError: (e: string | null) => void
) {
  return useMutation({
    mutationFn: async (payload: {
      name: string
      slug: string
      parentOrganizationId: string | null
    }) => {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        if (res.status === 409) throw new Error(body?.message ?? 'Slug already exists')
        if (res.status === 400) throw new Error(body?.message ?? 'Invalid data')
        throw new Error(body?.message ?? 'Failed to update organization')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Organization updated successfully')
      onSave()
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to update organization')
    },
  })
}

type ParentOrgSelectProps = {
  id: string
  value: string
  options: AdminOrganization[]
  onChange: (v: string) => void
}

function ParentOrgSelect({ id, value, options, onChange }: ParentOrgSelectProps) {
  return (
    <Select
      value={value || NONE_SENTINEL}
      onValueChange={(val) => onChange(val === NONE_SENTINEL ? '' : val)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="None (top-level)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_SENTINEL}>None (top-level)</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name} ({o.slug})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function EditOrgForm({ org, onSave, onCancel }: EditOrgFormProps) {
  const [name, setName] = useState(org.name)
  const [slug, setSlug] = useState(org.slug ?? '')
  const [parentOrgId, setParentOrgId] = useState(org.parentOrganization?.id ?? '')
  const [error, setError] = useState<string | null>(null)

  const { data: allOrgs } = useQuery<{ data: AdminOrganization[] }>({
    queryKey: adminOrgKeys.allForParent(),
    queryFn: async () => {
      const res = await fetch('/api/admin/organizations?view=tree')
      if (!res.ok) throw new Error('Failed to fetch organizations')
      return res.json()
    },
  })

  const mutation = useOrgEditMutation(org.id, onSave, setError)
  const availableParents = allOrgs?.data?.filter((o) => !o.deletedAt && o.id !== org.id) ?? []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    mutation.mutate({ name, slug, parentOrganizationId: parentOrgId || null })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PencilIcon className="size-4" />
          Edit Organization
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
              <Label htmlFor="edit-org-name">Name</Label>
              <Input
                id="edit-org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-org-slug">Slug</Label>
              <Input id="edit-org-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-org-parent">Parent Organization</Label>
              <ParentOrgSelect
                id="edit-org-parent"
                value={parentOrgId}
                options={availableParents}
                onChange={setParentOrgId}
              />
            </div>
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
  )
}

type OrgDetailHeaderProps = {
  data: AdminOrgDetail
  isEditing: boolean
  onEditToggle: (editing: boolean) => void
  onActionComplete: () => void
}

function OrgDetailHeader({
  data,
  isEditing,
  onEditToggle,
  onActionComplete,
}: OrgDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{data.name}</h1>
        <p className="text-sm text-muted-foreground">{data.slug ?? 'No slug'}</p>
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
        <OrgActions
          orgId={data.id}
          orgName={data.name}
          isArchived={Boolean(data.deletedAt)}
          onActionComplete={onActionComplete}
        />
      </div>
    </div>
  )
}

function AdminOrgDetailPage() {
  const { orgId } = Route.useParams()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const currentUserId = session?.user?.id ?? ''

  const { data, isLoading, error } = useQuery<AdminOrgDetail>({
    queryKey: adminOrgKeys.detail(orgId),
    queryFn: async () => {
      const res = await fetch(`/api/admin/organizations/${orgId}`)
      if (!res.ok) throw new Error('Organization not found')
      return res.json()
    },
  })

  function handleActionComplete() {
    queryClient.invalidateQueries({ queryKey: adminOrgKeys.detail(orgId) })
    queryClient.invalidateQueries({ queryKey: adminOrgKeys.all })
  }

  function handleEditSave() {
    setIsEditing(false)
    handleActionComplete()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <BackLink to="/admin/organizations" label="Back to Organizations" />
        <DetailSkeleton />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <BackLink to="/admin/organizations" label="Back to Organizations" />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Organization not found'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackLink to="/admin/organizations" label="Back to Organizations" />
      <OrgDetailHeader
        data={data}
        isEditing={isEditing}
        onEditToggle={setIsEditing}
        onActionComplete={handleActionComplete}
      />
      {isEditing && (
        <EditOrgForm org={data} onSave={handleEditSave} onCancel={() => setIsEditing(false)} />
      )}
      <ProfileCard data={data} />
      <MembersCard
        members={data.members}
        orgId={data.id}
        currentUserId={currentUserId}
        onActionComplete={handleActionComplete}
      />
      <ChildOrgsCard childOrgs={data.children} />
    </div>
  )
}
