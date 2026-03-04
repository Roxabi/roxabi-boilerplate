import { Button } from '@repo/ui'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { authClient, useSession } from '@/lib/authClient'
import { m } from '@/paraglide/messages'
import { AuthLayout } from '../../components/AuthLayout'

type VerifySearch = {
  token?: string
  error?: string
}

export const Route = createFileRoute('/magic-link/verify')({
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    token: typeof search.token === 'string' ? search.token : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  component: MagicLinkVerifyPage,
  head: () => ({
    meta: [{ title: `${m.auth_magic_link_verify_title()} | Roxabi` }],
  }),
})

function VerifyingState() {
  return (
    <AuthLayout title={m.auth_magic_link_verify_title()}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 aria-hidden="true" className="size-8 animate-spin text-muted-foreground" />
        <output className="text-sm text-muted-foreground">{m.auth_magic_link_verifying()}</output>
      </div>
    </AuthLayout>
  )
}

function ErrorState({ errorCode }: { errorCode: string }) {
  const errorMessage = getErrorMessage(errorCode)
  const showRequestNewLink = errorCode === 'EXPIRED_TOKEN'

  return (
    <AuthLayout title={m.auth_magic_link_verify_title()}>
      <div className="text-center space-y-4">
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
        {showRequestNewLink ? (
          <Button asChild className="w-full">
            <Link to="/login">{m.auth_magic_link_request_new()}</Link>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link to="/login" className="underline hover:text-foreground">
              {m.auth_back_to_sign_in()}
            </Link>
          </p>
        )}
      </div>
    </AuthLayout>
  )
}

function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'NO_TOKEN':
      return m.auth_missing_token()
    case 'EXPIRED_TOKEN':
      return m.auth_magic_link_expired()
    case 'INVALID_TOKEN':
      return m.auth_magic_link_invalid()
    default:
      return m.auth_magic_link_unknown_error()
  }
}

function WarningState({ email }: { email: string }) {
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await authClient.signOut()
      window.location.reload()
    } catch {
      setSigningOut(false)
    }
  }

  return (
    <AuthLayout title={m.auth_magic_link_verify_title()}>
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          {m.auth_magic_link_already_signed_in({ email })}
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={handleSignOut} disabled={signingOut} className="w-full">
            {signingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              m.auth_magic_link_sign_out_first()
            )}
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/dashboard">{m.auth_magic_link_go_to_dashboard()}</Link>
          </Button>
        </div>
      </div>
    </AuthLayout>
  )
}

function MagicLinkVerifyPage() {
  const { token, error } = Route.useSearch()
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isPending && session && !token && !error) {
      navigate({ to: '/dashboard' })
    }
  }, [isPending, session, token, error, navigate])

  // Wait for session to resolve before deciding
  if (isPending) return <VerifyingState />

  // Session + token: show warning
  if (session && token) {
    return <WarningState email={session.user.email} />
  }

  // Session + no token + no error: redirecting (handled by useEffect above)
  if (session && !token && !error) {
    return null
  }

  // No session (or error redirect): proceed with verification
  return <GuestVerifyFlow token={token} error={error} />
}

// Better Auth's magic link verify endpoint uses HTTP 302 redirects to communicate
// results (not JSON). We navigate the browser directly to the API endpoint:
//   - Valid token → 302 to callbackURL (/dashboard) with session cookie
//   - Invalid/expired → 302 to errorCallbackURL (/magic-link/verify?error=CODE)
function GuestVerifyFlow({
  token,
  error,
}: {
  token: string | undefined
  error: string | undefined
}) {
  // Navigate to API verify endpoint for server-side token processing.
  // Skipped when error is present (returning from API redirect) or token is missing.
  useEffect(() => {
    if (!token || error) return
    const params = new URLSearchParams({
      token,
      errorCallbackURL: `${window.location.origin}/magic-link/verify`,
    })
    window.location.href = `/api/auth/magic-link/verify?${params.toString()}`
  }, [token, error])

  // Error code from API redirect (e.g., ?error=EXPIRED_TOKEN)
  if (error) {
    return <ErrorState errorCode={error} />
  }

  // No token provided
  if (!token) {
    return <ErrorState errorCode="NO_TOKEN" />
  }

  return <VerifyingState />
}
