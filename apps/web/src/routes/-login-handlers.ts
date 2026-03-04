import type { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { fetchUserProfile } from '@/lib/api'
import { authClient } from '@/lib/authClient'
import { safeRedirect } from '@/lib/routeGuards'
import { m } from '@/paraglide/messages'
import type { LoginFormState } from './-login-hooks'

const COOLDOWN_SECONDS = 60

async function checkSoftDeletedAccount(navigate: ReturnType<typeof useNavigate>): Promise<boolean> {
  try {
    const res = await fetchUserProfile()
    if (!res.ok) return false
    const profile = (await res.json()) as Record<string, unknown>
    if (profile.deletedAt) {
      navigate({
        to: '/account-reactivation',
        search: { deleteScheduledFor: profile.deleteScheduledFor as string | undefined },
      })
      return true
    }
  } catch {
    // Non-blocking
  }
  return false
}

function handleSignInError(signInError: { status: number }, email: string, form: LoginFormState) {
  if (signInError.status === 429) {
    form.submitError(m.auth_rate_limit())
  } else if (signInError.status === 403) {
    form.markEmailNotVerified(email)
  } else {
    form.submitError(m.auth_login_invalid_credentials())
  }
}

async function handleSignInSuccess(
  navigate: ReturnType<typeof useNavigate>,
  redirectParam: string | undefined
) {
  toast.success(m.auth_toast_signed_in())
  const redirected = await checkSoftDeletedAccount(navigate)
  if (redirected) return
  navigate({ to: safeRedirect(redirectParam) })
}

export type AuthHandlerDeps = {
  form: LoginFormState
  navigate: ReturnType<typeof useNavigate>
  redirectParam: string | undefined
}

export function createLoginAuthHandlers(deps: AuthHandlerDeps) {
  const { form, navigate, redirectParam } = deps

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    form.submitStart()
    try {
      const { error: signInError } = await authClient.signIn.email({
        email: form.email,
        password: form.password,
        rememberMe: form.rememberMe,
      })
      if (signInError) {
        handleSignInError(signInError, form.email, form)
      } else {
        await handleSignInSuccess(navigate, redirectParam)
      }
    } catch {
      toast.error(m.auth_toast_error())
    } finally {
      form.setLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    form.submitStart()
    try {
      const { error: mlError } = await authClient.signIn.magicLink({
        email: form.magicLinkEmail,
        callbackURL: `${window.location.origin}/dashboard`,
      })
      if (mlError) {
        if (mlError.status === 429) {
          form.submitError(m.auth_rate_limit())
        } else if (mlError.code === 'USER_NOT_FOUND') {
          form.submitError(m.auth_magic_link_no_account())
        } else {
          form.submitError(m.auth_magic_link_error())
        }
      } else {
        toast.success(m.auth_toast_magic_link_sent())
        navigate({
          to: '/magic-link-sent',
          search: { email: form.magicLinkEmail, redirect: redirectParam },
        })
      }
    } catch {
      toast.error(m.auth_toast_error())
    } finally {
      form.setLoading(false)
    }
  }

  return { handleEmailLogin, handleMagicLink }
}

export type SecondaryHandlerDeps = {
  form: LoginFormState
  redirectParam: string | undefined
}

export function createLoginSecondaryHandlers(deps: SecondaryHandlerDeps) {
  const { form, redirectParam } = deps

  async function handleResendVerification() {
    if (!form.notVerifiedEmail) return
    form.setResendLoading(true)
    try {
      await authClient.sendVerificationEmail({
        email: form.notVerifiedEmail,
        callbackURL: `${window.location.origin}/verify-email`,
      })
      toast.success(m.auth_toast_verification_resent())
      form.setResendCooldown(COOLDOWN_SECONDS)
    } catch {
      toast.error(m.auth_toast_error())
    } finally {
      form.setResendLoading(false)
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    if (redirectParam) {
      try {
        sessionStorage.setItem('auth_redirect', redirectParam)
      } catch {
        // sessionStorage may be unavailable
      }
    }
    form.setOauthLoading(provider)
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: redirectParam
          ? `/login?redirect=${encodeURIComponent(redirectParam)}`
          : undefined,
      })
    } catch {
      toast.error(m.auth_toast_error())
      form.setOauthLoading(null)
    }
  }

  return { handleResendVerification, handleOAuth }
}
