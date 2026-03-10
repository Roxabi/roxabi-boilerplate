import { Tabs, TabsList, TabsTrigger } from '@repo/ui'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { appName } from '@/lib/appName'
import { fetchEnabledProviders } from '@/lib/authClient'
import { requireGuest } from '@/lib/routeGuards'
import { m } from '@/paraglide/messages'
import { AuthLayout } from '../components/AuthLayout'
import { LoginPageAlerts, MagicLinkTab, PasswordLoginTab } from './-login-components'
import { createLoginAuthHandlers, createLoginSecondaryHandlers } from './-login-handlers'
import { useLoginFormState, useResendCooldownEffect, useStoredRedirect } from './-login-hooks'

type LoginSearch = {
  redirect?: string
}

export const Route = createFileRoute('/login')({
  beforeLoad: requireGuest,
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  loader: fetchEnabledProviders,
  component: LoginPage,
  head: () => ({
    meta: [{ title: `${m.auth_sign_in_title()} | ${appName}` }],
  }),
})

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function useLoginPage() {
  const navigate = useNavigate()
  const { redirect: redirectParam } = Route.useSearch()
  const providers = Route.useLoaderData()
  const hasOAuth = providers.google || providers.github
  const form = useLoginFormState()

  useResendCooldownEffect(form.resendCooldown, form.decrementResendCooldown)
  useStoredRedirect(navigate)

  const authHandlers = createLoginAuthHandlers({
    form,
    navigate,
    redirectParam,
  })

  const secondaryHandlers = createLoginSecondaryHandlers({
    form,
    redirectParam,
  })

  return { form, providers, hasOAuth, redirectParam, authHandlers, secondaryHandlers }
}

function LoginPage() {
  const { form, providers, hasOAuth, redirectParam, authHandlers, secondaryHandlers } =
    useLoginPage()

  return (
    <AuthLayout title={m.auth_sign_in_title()} description={m.auth_sign_in_desc()}>
      <LoginPageAlerts
        emailNotVerified={form.emailNotVerified}
        resendCooldown={form.resendCooldown}
        resendLoading={form.resendLoading}
        error={form.error}
        onResend={secondaryHandlers.handleResendVerification}
      />

      <Tabs defaultValue="password" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">{m.auth_tab_password()}</TabsTrigger>
          <TabsTrigger value="magic-link">{m.auth_tab_magic_link()}</TabsTrigger>
        </TabsList>

        <PasswordLoginTab
          email={form.email}
          password={form.password}
          rememberMe={form.rememberMe}
          loading={form.loading}
          oauthLoading={form.oauthLoading}
          onSubmit={authHandlers.handleEmailLogin}
          onEmailChange={form.setEmail}
          onPasswordChange={form.setPassword}
          onRememberMeChange={form.setRememberMe}
          hasOAuth={hasOAuth}
          providers={providers}
          onOAuth={secondaryHandlers.handleOAuth}
        />

        <MagicLinkTab
          magicLinkEmail={form.magicLinkEmail}
          loading={form.loading}
          onSubmit={authHandlers.handleMagicLink}
          onMagicLinkEmailChange={form.setMagicLinkEmail}
        />
      </Tabs>

      <p className="text-center text-sm text-muted-foreground">
        {m.auth_no_account()}{' '}
        <Link
          to="/register"
          search={redirectParam ? { redirect: redirectParam } : undefined}
          className="underline hover:text-foreground"
        >
          {m.auth_register_link()}
        </Link>
      </p>
    </AuthLayout>
  )
}
