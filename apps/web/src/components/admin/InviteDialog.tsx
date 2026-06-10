import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui'
import { UserPlusIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { OrgRole } from '@/components/admin/types'
import { apiPost } from '@/lib/apiClient'
import { apiErrorToMessage } from '@/lib/errorUtils'
import { roleLabel } from '@/lib/orgUtils'
import { m } from '@/paraglide/messages'

async function inviteMember(email: string, roleId: string): Promise<void> {
  try {
    await apiPost<unknown>('/api/admin/members/invite', { email, roleId })
  } catch (err) {
    throw new Error(apiErrorToMessage(err, m.auth_toast_error()))
  }
}

type InviteDialogProps = {
  roles: OrgRole[]
  onSuccess: () => void
}

export function InviteDialog({ roles, onSuccess }: InviteDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Default to first role when roles load
  useEffect(() => {
    if (roles.length > 0 && !roleId) {
      const memberRole = roles.find((r) => r.name === 'member')
      setRoleId(memberRole?.id ?? roles[0]?.id ?? '')
    }
  }, [roles, roleId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!(email && roleId)) return
    setSubmitting(true)
    try {
      await inviteMember(email, roleId)
      toast.success(m.org_toast_invited({ email }))
      setEmail('')
      setOpen(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : m.auth_toast_error())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        // S6: Reset form state when dialog opens
        if (nextOpen) {
          setEmail('')
          const memberRole = roles.find((r) => r.name === 'member')
          setRoleId(memberRole?.id ?? roles[0]?.id ?? '')
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon className="mr-2 size-4" />
          {m.org_invite_title()}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.org_invite_title()}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">{m.org_invite_email()}</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder={m.org_invite_email_placeholder()}
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">{m.org_invite_role()}</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {roleLabel(role.slug)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {m.common_cancel()}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting || !email}>
              {submitting ? m.org_invite_sending() : m.org_invite_send()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
