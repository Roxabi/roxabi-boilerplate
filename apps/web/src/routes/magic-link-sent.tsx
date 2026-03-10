import { Button } from '@repo/ui'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { appName } from '@/lib/appName'
import { authClient } from '@/lib/authClient'
import { m } from '@/paraglide/messages'
import { AuthLayout } from '../components/AuthLayout'

type MagicLinkSearch = {
  email?: string
  redirect?: string
}

type EmailProvider = {
  name: string
  url: string
}

const EMAIL_PROVIDERS: Record<string, EmailProvider> = {
  'gmail.com': { name: 'Gmail', url: 'https://mail.google.com' },
  'outlook.com': { name: 'Outlook', url: 'https://outlook.live.com/mail' },
  'hotmail.com': { name: 'Outlook', url: 'https://outlook.live.com/mail' },
  'yahoo.com': { name: 'Yahoo Mail', url: 'https://mail.yahoo.com' },
  'icloud.com': { name: 'iCloud Mail', url: 'https://www.icloud.com/mail' },
  'protonmail.com': { name: 'ProtonMail', url: 'https://mail.proton.me' },
  'proton.me': { name: 'ProtonMail', url: 'https://mail.proton.me' },
}

export function detectEmailProvider(email: string): EmailProvider | null {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return null
  return EMAIL_PROVIDERS[domain] ?? null
}

const COOLDOWN_SECONDS = 60

export const Route = createFileRoute('/magic-link-sent')({
  validateSearch: (search: Record<string, unknown>): MagicLinkSearch => ({
    email: typeof search.email === 'string' ? search.email : undefined,
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: MagicLinkSentPage,
  head: () => ({
    meta: [{ title: `${m.auth_magic_link_sent_title()} | ${appName}` }],
  }),
})

function MagicLinkSentPage() {
  const { email, redirect } = Route.useSearch()
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const provider = email ? detectEmailProvider(email) : null

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleResend() {
    if (!email) return
    setLoading(true)
    try {
      const { error } = await authClient.signIn.magicLink({
        email,
        callbackURL: `${window.location.origin}/dashboard`,
      })
      if (error) {
        toast.error(error.message ?? m.auth_toast_error())
      } else {
        toast.success(m.auth_toast_magic_link_resent())
        setCooldown(COOLDOWN_SECONDS)
      }
    } catch {
      toast.error(m.auth_toast_error())
    } finally {
      setLoading(false)
    }
  }

  const canResend = !loading && cooldown <= 0

  return (
    <AuthLayout title={m.auth_magic_link_sent_title()} description={m.auth_magic_link_sent_desc()}>
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          {email ? m.auth_magic_link_sent_message({ email }) : m.auth_check_email_magic_link()}
        </p>

        {provider && (
          <Button asChild className="w-full">
            <a href={provider.url} target="_blank" rel="noopener noreferrer">
              {m.auth_open_email_provider({ provider: provider.name })}
              <ExternalLink className="ml-2 size-4" aria-hidden="true" />
            </a>
          </Button>
        )}

        {email && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{m.auth_didnt_receive()}</p>
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={!canResend}
              className="w-full"
            >
              {loading
                ? m.auth_sending()
                : cooldown > 0
                  ? m.auth_resend_in({ seconds: String(cooldown) })
                  : m.auth_resend_magic_link()}
            </Button>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          <Link
            to="/login"
            search={redirect ? { redirect } : undefined}
            className="underline hover:text-foreground"
          >
            {m.auth_back_to_sign_in()}
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
