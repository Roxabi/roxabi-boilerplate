import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  PasswordInput,
} from '@repo/ui'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { authClient } from '@/lib/authClient'
import { m } from '@/paraglide/messages'

function useIsOAuthOnly() {
  const [isOAuthOnly, setIsOAuthOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      try {
        const { data } = await authClient.listAccounts()
        if (data) {
          const hasCredential = data.some((account) => account.providerId === 'credential')
          setIsOAuthOnly(!hasCredential)
        }
      } catch {
        // Default to showing all sections
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [])

  return { isOAuthOnly, loading }
}

function EmailChangeSection() {
  const [newEmail, setNewEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.trim()) return
    setSubmitting(true)
    try {
      const { error } = await authClient.changeEmail({ newEmail })
      if (error) {
        toast.error(m.account_email_change_error())
      } else {
        toast.success(m.account_email_change_success({ email: newEmail }))
        setNewEmail('')
      }
    } catch {
      toast.error(m.account_email_change_error())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.account_email_title()}</CardTitle>
        <CardDescription>{m.account_email_description()}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newEmail">{m.account_email_new_label()}</Label>
            <Input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmail(e.target.value)}
              placeholder={m.account_email_placeholder()}
              required
              disabled={submitting}
            />
          </div>
          <Button type="submit" disabled={submitting || !newEmail.trim()}>
            {submitting ? m.account_email_sending() : m.account_email_change()}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function PasswordChangeSection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const passwordsMatch = newPassword === confirmPassword
  const canSubmit = currentPassword && newPassword && confirmPassword && passwordsMatch

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
      })
      if (error) {
        toast.error(m.account_password_update_error())
      } else {
        toast.success(m.account_password_update_success())
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      toast.error(m.account_password_update_error())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.account_password_title()}</CardTitle>
        <CardDescription>{m.account_password_description()}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{m.account_password_current()}</Label>
            <PasswordInput
              id="currentPassword"
              value={currentPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCurrentPassword(e.target.value)
              }
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{m.account_password_new()}</Label>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{m.account_password_confirm()}</Label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfirmPassword(e.target.value)
              }
              disabled={submitting}
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-sm text-destructive">{m.account_password_mismatch()}</p>
            )}
          </div>
          <Button type="submit" disabled={submitting || !canSubmit}>
            {submitting ? m.account_password_updating() : m.account_password_update()}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export { useIsOAuthOnly, EmailChangeSection, PasswordChangeSection }
