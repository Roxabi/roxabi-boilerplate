import { Button, FormMessage, Input, Label } from '@repo/ui'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { appName } from '@/lib/appName'
import { authClient } from '@/lib/authClient'
import { requireGuest } from '@/lib/routeGuards'
import { m } from '@/paraglide/messages'
import { AuthLayout } from '../components/AuthLayout'

const COOLDOWN_SECONDS = 60

export const Route = createFileRoute('/reset-password')({
  beforeLoad: requireGuest,
  component: ResetPasswordPage,
  head: () => ({
    meta: [{ title: `${m.auth_reset_password_title()} | ${appName}` }],
  }),
})

function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const { error: resetError } = await authClient.requestPasswordReset({ email })
      if (resetError?.status === 429) {
        setError(m.auth_rate_limit())
      } else {
        // Always show the same message regardless of whether the email exists (security guardrail)
        toast.success(m.auth_toast_reset_link_sent())
        setMessage(m.auth_reset_password_sent())
        setCooldown(COOLDOWN_SECONDS)
      }
    } catch {
      toast.error(m.auth_toast_error())
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !loading && cooldown <= 0

  return (
    <AuthLayout title={m.auth_reset_password_title()} description={m.auth_reset_password_desc()}>
      {error && (
        <FormMessage variant="error" className="justify-center">
          {error}
        </FormMessage>
      )}
      {message && (
        <p aria-live="polite" className="text-sm text-muted-foreground text-center">
          {message}
        </p>
      )}

      <form onSubmit={handleRequestReset} aria-busy={loading} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{m.auth_email()}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={!canSubmit}>
          {loading
            ? m.auth_sending()
            : cooldown > 0
              ? m.auth_resend_reset_in({ seconds: String(cooldown) })
              : m.auth_send_reset_link()}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {m.auth_remember_password()}{' '}
        <Link to="/login" className="underline hover:text-foreground">
          {m.auth_sign_in_link()}
        </Link>
      </p>
    </AuthLayout>
  )
}
