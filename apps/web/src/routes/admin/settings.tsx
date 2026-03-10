import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DestructiveConfirmDialog,
  Input,
  Label,
} from '@repo/ui'
import { createFileRoute, useBlocker } from '@tanstack/react-router'
import { AlertTriangleIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { appName } from '@/lib/appName'
import { authClient } from '@/lib/authClient'
import { isErrorWithMessage } from '@/lib/errorUtils'
import { hasPermission } from '@/lib/permissions'
import { enforceRoutePermission, useEnrichedSession } from '@/lib/routePermissions'
import { useOrganizations } from '@/lib/useOrganizations'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

type SoftDeletableOrg = {
  deletedAt?: string | null
  deleteScheduledFor?: string | null
}

function hasSoftDeleteFields(org: unknown): org is SoftDeletableOrg {
  if (org == null || typeof org !== 'object') return false
  return 'deletedAt' in org
}

export const Route = createFileRoute('/admin/settings')({
  staticData: { permission: 'members:write' },
  beforeLoad: enforceRoutePermission,
  component: AdminSettingsPage,
  head: () => ({
    meta: [{ title: `${m.org_settings_title()} | ${appName}` }],
  }),
})

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type DeletionImpact = {
  memberCount: number
  invitationCount: number
  customRoleCount: number
}

type DangerZoneCardProps = {
  orgId: string
  orgName: string
  onDeleted: () => void
}

async function fetchDeletionImpact(orgId: string): Promise<DeletionImpact | null> {
  try {
    const res = await fetch(`/api/organizations/${orgId}/deletion-impact`, {
      credentials: 'include',
    })
    if (res.ok) return (await res.json()) as DeletionImpact
  } catch {
    // Proceed without impact summary
  }
  return null
}

async function deleteOrganization(orgId: string, orgName: string): Promise<boolean> {
  const res = await fetch(`/api/organizations/${orgId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmName: orgName }),
  })

  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null)
    toast.error(isErrorWithMessage(data) ? data.message : m.auth_toast_error())
    return false
  }
  return true
}

function DeletionImpactSummary({ impact }: { impact: DeletionImpact }) {
  return (
    <div className="space-y-1 text-sm">
      <p>{m.admin_settings_impact_members({ count: impact.memberCount })}</p>
      {impact.invitationCount > 0 && (
        <p>{m.admin_settings_impact_invitations({ count: impact.invitationCount })}</p>
      )}
      {impact.customRoleCount > 0 && (
        <p>{m.admin_settings_impact_roles({ count: impact.customRoleCount })}</p>
      )}
      <p className="pt-1 text-muted-foreground">{m.org_deletion_grace_period()}</p>
    </div>
  )
}

function DangerZoneCard({ orgId, orgName, onDeleted }: DangerZoneCardProps) {
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [impact, setImpact] = useState<DeletionImpact | null>(null)
  const [loadingImpact, setLoadingImpact] = useState(false)

  async function handleDeleteClick() {
    setLoadingImpact(true)
    const result = await fetchDeletionImpact(orgId)
    setImpact(result)
    setLoadingImpact(false)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const success = await deleteOrganization(orgId, orgName)
      if (success) {
        toast.success(m.org_toast_deleted())
        setDeleteOpen(false)
        onDeleted()
      }
    } catch {
      toast.error(m.auth_toast_error())
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-destructive">{m.org_settings_danger()}</CardTitle>
        <CardDescription>{m.org_settings_danger_desc()}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={handleDeleteClick} disabled={loadingImpact}>
          {loadingImpact ? m.org_deleting() : m.org_delete()}
        </Button>

        <DestructiveConfirmDialog
          open={deleteOpen}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setDeleteOpen(false)
              setImpact(null)
            }
          }}
          title={m.org_delete_title()}
          description={m.org_delete_type_confirm({ name: orgName })}
          confirmText={orgName}
          confirmLabel={m.org_delete_type_placeholder()}
          impactSummary={impact ? <DeletionImpactSummary impact={impact} /> : null}
          onConfirm={handleDelete}
          isLoading={deleting}
        />
      </CardContent>
    </Card>
  )
}

type GeneralSettingsCardProps = {
  orgName: string
  orgSlug: string
  canEdit: boolean
  onDirtyChange: (dirty: boolean) => void
}

function useGeneralSettingsForm(
  orgName: string,
  orgSlug: string,
  onDirtyChange: (dirty: boolean) => void
) {
  const [name, setName] = useState(orgName)
  const [slug, setSlug] = useState(orgSlug)
  const [saving, setSaving] = useState(false)
  const [slugError, setSlugError] = useState('')
  const isDirty = name !== orgName || slug !== orgSlug

  useEffect(() => {
    setName(orgName)
    setSlug(orgSlug)
  }, [orgName, orgSlug])

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value)
    if (slugError) setSlugError('')
  }

  function handleSlugBlur() {
    if (slug && !SLUG_REGEX.test(slug)) setSlugError(m.org_slug_invalid())
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (slug && !SLUG_REGEX.test(slug)) {
      setSlugError(m.org_slug_invalid())
      return
    }
    setSaving(true)
    try {
      const { error } = await authClient.organization.update({ data: { name, slug } })
      if (error) toast.error(error.message ?? m.auth_toast_error())
      else toast.success(m.org_toast_updated())
    } catch {
      toast.error(m.auth_toast_error())
    } finally {
      setSaving(false)
    }
  }

  return {
    name,
    setName,
    slug,
    setSlug,
    saving,
    slugError,
    isDirty,
    handleSlugChange,
    handleSlugBlur,
    handleSave,
  }
}

type SlugFieldProps = {
  slug: string
  slugError: string
  canEdit: boolean
  saving: boolean
  name: string
  onSlugChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSlugBlur: () => void
  onGenerate: () => void
}

function SlugField({
  slug,
  slugError,
  canEdit,
  saving,
  name,
  onSlugChange,
  onSlugBlur,
  onGenerate,
}: SlugFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="org-slug">{m.org_slug()}</Label>
      <div className="flex gap-2">
        <Input
          id="org-slug"
          value={slug}
          onChange={onSlugChange}
          onBlur={onSlugBlur}
          placeholder={m.org_slug_placeholder()}
          disabled={!canEdit || saving}
          required
          className="flex-1"
          aria-invalid={slugError ? true : undefined}
          aria-describedby={slugError ? 'slug-error' : undefined}
        />
        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={saving || !name.trim()}
          >
            {m.org_slug_generate()}
          </Button>
        )}
      </div>
      {slugError && (
        <p id="slug-error" className="text-sm text-destructive">
          {slugError}
        </p>
      )}
    </div>
  )
}

function GeneralSettingsCard({
  orgName,
  orgSlug,
  canEdit,
  onDirtyChange,
}: GeneralSettingsCardProps) {
  const form = useGeneralSettingsForm(orgName, orgSlug, onDirtyChange)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.org_settings_general()}</CardTitle>
        {!canEdit && <CardDescription>{m.org_settings_read_only()}</CardDescription>}
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">{m.org_name()}</Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setName(e.target.value)}
              placeholder={m.org_name_placeholder()}
              disabled={!canEdit || form.saving}
              required
            />
          </div>
          <SlugField
            slug={form.slug}
            slugError={form.slugError}
            canEdit={canEdit}
            saving={form.saving}
            name={form.name}
            onSlugChange={form.handleSlugChange}
            onSlugBlur={form.handleSlugBlur}
            onGenerate={() => form.setSlug(slugify(form.name))}
          />
          {canEdit && (
            <Button type="submit" disabled={form.saving || !form.isDirty}>
              {form.saving ? m.org_settings_saving() : m.org_settings_save()}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

type UnsavedChangesDialogProps = {
  status: string
  proceed?: () => void
  reset?: () => void
}

function UnsavedChangesDialog({ status, proceed, reset }: UnsavedChangesDialogProps) {
  if (status !== 'blocked') {
    return null
  }

  return (
    <DestructiveConfirmDialog
      open
      onOpenChange={() => reset?.()}
      title={m.org_unsaved_changes()}
      description={m.org_unsaved_desc()}
      confirmText="leave"
      confirmLabel={m.org_unsaved_leave_confirm()}
      onConfirm={() => proceed?.()}
    />
  )
}

type ReactivationBannerProps = {
  orgId: string
  deleteScheduledFor: string
  canReactivate: boolean
}

function ReactivationBanner({ orgId, deleteScheduledFor, canReactivate }: ReactivationBannerProps) {
  const [reactivating, setReactivating] = useState(false)

  const formattedDate = new Date(deleteScheduledFor).toLocaleDateString(getLocale())

  async function handleReactivate() {
    setReactivating(true)
    try {
      const res = await fetch(`/api/organizations/${orgId}/reactivate`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null)
        toast.error(isErrorWithMessage(data) ? data.message : m.org_reactivation_error())
        return
      }

      toast.success(m.org_reactivation_success())
      // Force session refresh to clear cached state
      window.location.reload()
    } catch {
      toast.error(m.org_reactivation_error())
    } finally {
      setReactivating(false)
    }
  }

  return (
    <Alert variant="destructive">
      <AlertTriangleIcon className="size-4" />
      <AlertTitle>{m.org_reactivation_title()}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{m.org_reactivation_scheduled({ date: formattedDate })}</p>
        {canReactivate ? (
          <Button variant="outline" size="sm" onClick={handleReactivate} disabled={reactivating}>
            {reactivating ? m.org_reactivation_reactivating() : m.org_reactivation_button()}
          </Button>
        ) : (
          <p className="text-sm">{m.org_reactivation_contact()}</p>
        )}
      </AlertDescription>
    </Alert>
  )
}

function useOrgDeletionStatus(
  activeOrg: { id: string } | null | undefined,
  orgs: Array<{ id: string }> | undefined
) {
  const isOrgValid = orgs?.some((org) => org.id === activeOrg?.id)
  const softDelete = hasSoftDeleteFields(activeOrg) ? activeOrg : null
  const orgDeletedAt = softDelete?.deletedAt
  const orgDeleteScheduledFor = softDelete?.deleteScheduledFor
  const isOrgDeleted = orgDeletedAt || (orgs !== undefined && !isOrgValid)

  return { isOrgDeleted, orgDeletedAt, orgDeleteScheduledFor }
}

function AdminSettingsPage() {
  const { data: session } = useEnrichedSession()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const { data: orgs } = useOrganizations(session?.user?.id)

  const canDeleteOrg = hasPermission(session, 'organizations:delete')
  const canEditOrg = hasPermission(session, 'organizations:write')
  const [isDirty, setIsDirty] = useState(false)

  const { status, proceed, reset } = useBlocker({
    shouldBlockFn: () => isDirty,
    withResolver: true,
    enableBeforeUnload: true,
  })

  const { isOrgDeleted, orgDeletedAt, orgDeleteScheduledFor } = useOrgDeletionStatus(
    activeOrg,
    orgs
  )

  if (!activeOrg) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{m.org_settings_title()}</h1>
        <p className="text-muted-foreground">{m.org_switcher_no_org()}</p>
      </div>
    )
  }

  if (isOrgDeleted) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{m.org_settings_title()}</h1>
        <ReactivationBanner
          orgId={activeOrg.id}
          deleteScheduledFor={orgDeleteScheduledFor ?? orgDeletedAt ?? new Date().toISOString()}
          canReactivate={canDeleteOrg}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{m.org_settings_title()}</h1>
      <GeneralSettingsCard
        orgName={activeOrg.name}
        orgSlug={activeOrg.slug ?? ''}
        canEdit={canEditOrg}
        onDirtyChange={setIsDirty}
      />
      {canDeleteOrg && (
        <DangerZoneCard
          orgId={activeOrg.id}
          orgName={activeOrg.name}
          onDeleted={() => {
            setIsDirty(false)
            window.location.href = '/'
          }}
        />
      )}
      <UnsavedChangesDialog status={status} proceed={proceed} reset={reset} />
    </div>
  )
}
