import type { AdminOrganization } from '@repo/types'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@repo/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { adminOrgKeys } from '@/lib/admin/queryKeys'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
}

type CreateOrgDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const NATIVE_SELECT_CLASS =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none'

function useCreateOrgMutation(callbacks: {
  onSuccess: (data: { id: string }) => void
  onError: (err: unknown) => void
}) {
  return useMutation({
    mutationFn: async (payload: { name: string; slug: string; parentOrganizationId?: string }) => {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        if (res.status === 409) throw new Error(body?.message ?? 'Slug already exists')
        if (res.status === 400) throw new Error(body?.message ?? 'Invalid organization data')
        throw new Error(body?.message ?? 'Failed to create organization')
      }
      return res.json()
    },
    onSuccess: callbacks.onSuccess,
    onError: callbacks.onError,
  })
}

type CreateOrgFormFieldsProps = {
  name: string
  slug: string
  parentOrgId: string
  parentOrgs: AdminOrganization[]
  onNameChange: (v: string) => void
  onSlugChange: (v: string) => void
  onParentChange: (v: string) => void
}

function CreateOrgFormFields(props: CreateOrgFormFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="create-org-name">Name</Label>
        <Input
          id="create-org-name"
          value={props.name}
          onChange={(e) => props.onNameChange(e.target.value)}
          placeholder="Organization name"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="create-org-slug">Slug</Label>
        <Input
          id="create-org-slug"
          value={props.slug}
          onChange={(e) => props.onSlugChange(e.target.value)}
          placeholder="organization-slug"
        />
        <p className="text-xs text-muted-foreground">
          Auto-generated from name. Edit to customize.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="create-org-parent">Parent Organization (optional)</Label>
        <select
          id="create-org-parent"
          value={props.parentOrgId}
          onChange={(e) => props.onParentChange(e.target.value)}
          className={NATIVE_SELECT_CLASS}
        >
          <option value="">None (top-level)</option>
          {props.parentOrgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name} ({org.slug})
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

async function fetchAllOrgs(): Promise<{ data: AdminOrganization[] }> {
  const res = await fetch('/api/admin/organizations?view=tree')
  if (!res.ok) throw new Error('Failed to fetch organizations')
  return res.json()
}

type CreateOrgFormState = {
  name: string
  setName: (v: string) => void
  slug: string
  parentOrgId: string
  setParentOrgId: (v: string) => void
  error: string | null
  setError: (v: string | null) => void
  mutation: ReturnType<typeof useCreateOrgMutation>
  parentOrgs: AdminOrganization[]
  handleSlugChange: (v: string) => void
  handleOpenChange: (next: boolean) => void
}

function useCreateOrgForm(
  open: boolean,
  onOpenChange: (open: boolean) => void
): CreateOrgFormState {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [parentOrgId, setParentOrgId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: allOrgs } = useQuery({
    queryKey: adminOrgKeys.allForParent(),
    queryFn: fetchAllOrgs,
    enabled: open,
  })

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name))
  }, [name, slugEdited])

  function reset() {
    setName('')
    setSlug('')
    setSlugEdited(false)
    setParentOrgId('')
    setError(null)
  }

  const mutation = useCreateOrgMutation({
    onSuccess: (data) => {
      toast.success('Organization created successfully')
      queryClient.invalidateQueries({ queryKey: adminOrgKeys.all })
      onOpenChange(false)
      reset()
      navigate({ to: '/admin/organizations/$orgId', params: { orgId: data.id } })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create'),
  })

  return {
    name,
    setName,
    slug,
    parentOrgId,
    setParentOrgId,
    error,
    setError,
    mutation,
    parentOrgs: allOrgs?.data?.filter((org) => !org.deletedAt) ?? [],
    handleSlugChange: (v) => {
      setSlugEdited(true)
      setSlug(v)
    },
    handleOpenChange: (next) => {
      if (!next) reset()
      onOpenChange(next)
    },
  }
}

function CreateOrganizationDialog({ open, onOpenChange }: CreateOrgDialogProps) {
  const form = useCreateOrgForm(open, onOpenChange)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    form.setError(null)
    const payload: { name: string; slug: string; parentOrganizationId?: string } = {
      name: form.name,
      slug: form.slug,
    }
    if (form.parentOrgId) payload.parentOrganizationId = form.parentOrgId
    form.mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={form.handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>Create a new organization with an optional parent.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {form.error && (
            <p className="text-sm text-destructive rounded-md border border-destructive/20 bg-destructive/5 p-3">
              {form.error}
            </p>
          )}
          <CreateOrgFormFields
            name={form.name}
            slug={form.slug}
            parentOrgId={form.parentOrgId}
            parentOrgs={form.parentOrgs}
            onNameChange={form.setName}
            onSlugChange={form.handleSlugChange}
            onParentChange={form.setParentOrgId}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => form.handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form.name.trim()} loading={form.mutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { CreateOrganizationDialog }
