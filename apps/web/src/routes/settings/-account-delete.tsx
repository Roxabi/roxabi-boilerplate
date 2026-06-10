import type { OrgOwnershipResolution } from '@repo/types'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui'
import { useNavigate } from '@tanstack/react-router'
import { AlertTriangleIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { deleteAccount, fetchOrganizations } from '@/lib/api'
import { authClient, useSession } from '@/lib/authClient'
import { m } from '@/paraglide/messages'

type OwnedOrg = {
  id: string
  name: string
  memberCount: number
  members: Array<{ id: string; userId: string; name: string; role: string }>
}

function OrgResolutionStep({
  orgs,
  resolutions,
  onResolve,
}: {
  orgs: OwnedOrg[]
  resolutions: OrgOwnershipResolution[]
  onResolve: (resolutions: OrgOwnershipResolution[]) => void
}) {
  function setResolution(orgId: string, value: OrgOwnershipResolution) {
    const exists = resolutions.some((r) => r.organizationId === orgId)
    if (exists) {
      onResolve(resolutions.map((r) => (r.organizationId === orgId ? value : r)))
    } else {
      onResolve([...resolutions, value])
    }
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangleIcon className="size-4" />
        <AlertTitle>{m.account_org_ownership_title()}</AlertTitle>
        <AlertDescription>{m.account_org_ownership_description()}</AlertDescription>
      </Alert>

      {orgs.map((org) => {
        const resolution = resolutions.find((r) => r.organizationId === org.id)
        const action = resolution?.action ?? 'delete'
        const currentTransferUserId =
          resolution?.action === 'transfer' ? resolution.transferToUserId : ''
        const eligibleMembers = org.members.filter((member) => member.role !== 'owner')

        return (
          <Card key={org.id}>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{org.name}</p>
                    {/* Two keys required: @inlang/plugin-message-format flat JSON does not support ICU plural syntax */}
                    <p className="text-sm text-muted-foreground">
                      {org.memberCount === 1
                        ? m.account_org_member_count({ count: org.memberCount })
                        : m.account_org_members_count({ count: org.memberCount })}
                    </p>
                  </div>
                </div>

                <Select
                  value={action}
                  onValueChange={(v: string) => {
                    if (v === 'delete') {
                      setResolution(org.id, { organizationId: org.id, action: 'delete' })
                    } else if (v === 'transfer') {
                      setResolution(org.id, {
                        organizationId: org.id,
                        action: 'transfer',
                        transferToUserId: currentTransferUserId,
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleMembers.length > 0 && (
                      <SelectItem value="transfer">{m.account_org_transfer()}</SelectItem>
                    )}
                    <SelectItem value="delete">{m.account_org_delete()}</SelectItem>
                  </SelectContent>
                </Select>

                {action === 'transfer' && eligibleMembers.length > 0 && (
                  <Select
                    value={currentTransferUserId}
                    onValueChange={(v: string) => {
                      setResolution(org.id, {
                        organizationId: org.id,
                        action: 'transfer',
                        transferToUserId: v,
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={m.account_org_select_member()} />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleMembers.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

async function fetchOwnedOrgsForUser(userId: string | undefined): Promise<OwnedOrg[]> {
  try {
    const res = await fetchOrganizations()
    const orgsData: Array<{ id: string; name: string }> = res.ok ? await res.json() : []
    if (orgsData.length === 0) return []

    const owned: OwnedOrg[] = []
    for (const org of orgsData) {
      const { data: fullOrg } = await authClient.organization.getFullOrganization({
        query: { organizationId: org.id },
      })
      if (!fullOrg) continue

      const userMember = fullOrg.members.find(
        (member: { userId: string; role: string }) => member.userId === userId
      )
      if (userMember && userMember.role === 'owner') {
        owned.push({
          id: org.id,
          name: org.name,
          memberCount: fullOrg.members.length,
          members: fullOrg.members.map(
            (member: {
              id: string
              userId: string
              role: string
              user: { name: string | null }
            }) => ({
              id: member.id,
              userId: member.userId,
              name: member.user.name ?? m.account_org_member_unknown(),
              role: member.role,
            })
          ),
        })
      }
    }
    return owned
  } catch {
    return []
  }
}

function useDeleteAccountFlow(userId: string | undefined) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [ownedOrgs, setOwnedOrgs] = useState<OwnedOrg[]>([])
  const [resolutions, setResolutions] = useState<OrgOwnershipResolution[]>([])
  const [showOrgStep, setShowOrgStep] = useState(false)
  const [loadingOrgs, setLoadingOrgs] = useState(false)

  async function startDelete() {
    setLoadingOrgs(true)
    const orgs = await fetchOwnedOrgsForUser(userId)
    setOwnedOrgs(orgs)
    if (orgs.length > 0) {
      setResolutions(orgs.map((org) => ({ organizationId: org.id, action: 'delete' as const })))
      setShowOrgStep(true)
    } else {
      setShowOrgStep(false)
      setDeleteOpen(true)
    }
    setLoadingOrgs(false)
  }

  function confirmDelete() {
    setDeleteOpen(true)
  }

  function cancelDelete() {
    setDeleteOpen(false)
  }

  function dismissOrgStep() {
    setShowOrgStep(false)
    setResolutions([])
  }

  function setDeletingState(v: boolean) {
    setDeleting(v)
  }

  return {
    deleteOpen,
    deleting,
    ownedOrgs,
    resolutions,
    setResolutions,
    showOrgStep,
    loadingOrgs,
    startDelete,
    confirmDelete,
    cancelDelete,
    dismissOrgStep,
    setDeletingState,
  }
}

function DangerZoneCard({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <Card id="danger-zone">
      <CardHeader>
        <CardTitle className="text-destructive">{m.account_danger_zone()}</CardTitle>
        <CardDescription>{m.account_danger_zone_desc()}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={onClick} disabled={loading}>
          {loading ? m.account_delete_checking() : m.account_delete_button()}
        </Button>
      </CardContent>
    </Card>
  )
}

function DeleteAccountDialogs({
  flow,
  userEmail,
  onOrgStepComplete,
  onConfirmDelete,
}: {
  flow: ReturnType<typeof useDeleteAccountFlow>
  userEmail: string
  onOrgStepComplete: () => void
  onConfirmDelete: () => void
}) {
  return (
    <>
      {flow.showOrgStep && (
        <DestructiveConfirmDialog
          open={flow.showOrgStep}
          onOpenChange={(open: boolean) => {
            if (!open) flow.dismissOrgStep()
          }}
          title={m.account_delete_resolve_title()}
          description={m.account_delete_resolve_desc()}
          confirmText={userEmail}
          confirmLabel={m.account_delete_resolve_email_label()}
          impactSummary={
            <OrgResolutionStep
              orgs={flow.ownedOrgs}
              resolutions={flow.resolutions}
              onResolve={flow.setResolutions}
            />
          }
          onConfirm={onOrgStepComplete}
          isLoading={false}
        />
      )}

      <DestructiveConfirmDialog
        open={flow.deleteOpen}
        onOpenChange={(open: boolean) => {
          if (!open) flow.cancelDelete()
        }}
        title={m.account_delete_confirm_title()}
        description={m.account_delete_confirm_desc()}
        confirmText={userEmail}
        confirmLabel={m.account_delete_confirm_email_label()}
        onConfirm={onConfirmDelete}
        isLoading={flow.deleting}
      />
    </>
  )
}

function DeleteAccountSection() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const userEmail = session?.user?.email ?? ''
  const flow = useDeleteAccountFlow(session?.user?.id)

  async function handleConfirmDelete() {
    flow.setDeletingState(true)
    try {
      const res = await deleteAccount(userEmail, flow.resolutions)
      if (!res.ok) {
        toast.error(m.account_delete_error())
        return
      }
      flow.cancelDelete()
      toast.success(m.account_delete_success())
      navigate({ to: '/account-reactivation' })
    } catch {
      toast.error(m.account_delete_error())
    } finally {
      flow.setDeletingState(false)
    }
  }

  async function handleOrgStepComplete() {
    const allResolved = flow.resolutions.every(
      (r) => r.action === 'delete' || (r.action === 'transfer' && r.transferToUserId)
    )
    if (!allResolved) {
      toast.error(m.account_delete_select_member())
      return
    }
    flow.dismissOrgStep()
    await handleConfirmDelete()
  }

  return (
    <>
      <DangerZoneCard loading={flow.loadingOrgs} onClick={flow.startDelete} />
      <DeleteAccountDialogs
        flow={flow}
        userEmail={userEmail}
        onOrgStepComplete={handleOrgStepComplete}
        onConfirmDelete={handleConfirmDelete}
      />
    </>
  )
}

export { DeleteAccountSection }
