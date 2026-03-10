import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  cn,
  FormMessage,
  Input,
  Label,
  OAuthButton,
  PasswordInput,
} from '@repo/ui'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { legalConfig } from '@/config/legal.config'
import { appName } from '@/lib/appName'
import { authClient, fetchEnabledProviders } from '@/lib/authClient'
import { requireGuest } from '@/lib/routeGuards'
import { m } from '@/paraglide/messages'
import { AuthLayout } from '../components/AuthLayout'
import { OrDivider } from '../components/OrDivider'

type RegisterSearch = {
  redirect?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const Route = createFileRoute('/register')({
  beforeLoad: requireGuest,
  validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  loader: fetchEnabledProviders,
  component: RegisterPage,
  head: () => ({
    meta: [{ title: `${m.auth_register_title()} | ${appName}` }],
  }),
})

// ---------------------------------------------------------------------------
// Custom hook: useRegisterFormState
// ---------------------------------------------------------------------------

function useRegisterFormState() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [emailError, setEmailError] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  function clearErrors() {
    setError('')
    setMessage('')
  }

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    error,
    setError,
    message,
    setMessage,
    loading,
    setLoading,
    oauthLoading,
    setOauthLoading,
    emailError,
    setEmailError,
    acceptedTerms,
    setAcceptedTerms,
    clearErrors,
  }
}

type RegisterFormState = ReturnType<typeof useRegisterFormState>

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RegistrationSuccess({
  message,
  redirectParam,
}: {
  message: string
  redirectParam?: string
}) {
  return (
    <AuthLayout title={m.auth_register_title()} description={m.auth_register_desc()}>
      <Card className="border-0 shadow-none">
        <CardHeader className="items-center text-center">
          <CheckCircle className="size-12 text-success" aria-hidden="true" />
          <CardTitle className="text-lg">{m.auth_register_success_title()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{message}</p>
          <Link
            to="/login"
            search={redirectParam ? { redirect: redirectParam } : undefined}
            className="inline-block text-sm underline hover:text-foreground text-muted-foreground"
          >
            {m.auth_back_to_sign_in()}
          </Link>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

type RegistrationFormProps = {
  form: RegisterFormState
  onSubmit: (e: React.FormEvent) => void
  hasOAuth: boolean
  providers: { google?: boolean; github?: boolean }
  onOAuth: (provider: 'google' | 'github') => void
  redirectParam?: string
}

function RegistrationPasswordField({
  password,
  onPasswordChange,
  loading,
}: {
  password: string
  onPasswordChange: (v: string) => void
  loading: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="password">{m.auth_password()}</Label>
      <PasswordInput
        id="password"
        value={password}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPasswordChange(e.target.value)}
        required
        disabled={loading}
        showStrength
        strengthLabels={{
          weak: m.password_strength_weak(),
          fair: m.password_strength_fair(),
          good: m.password_strength_good(),
          strong: m.password_strength_strong(),
        }}
        ruleLabels={{
          minLength: m.password_rule_min_length(),
          uppercase: m.password_rule_uppercase(),
          number: m.password_rule_number(),
          symbol: m.password_rule_symbol(),
        }}
        toggleLabels={{
          show: m.password_toggle_show(),
          hide: m.password_toggle_hide(),
        }}
      />
    </div>
  )
}

function RegistrationFields({
  form,
  onSubmit,
}: {
  form: RegisterFormState
  onSubmit: (e: React.FormEvent) => void
}) {
  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    form.setEmail(e.target.value)
    if (form.emailError) form.setEmailError('')
  }

  function handleEmailBlur() {
    if (form.email && !EMAIL_REGEX.test(form.email)) {
      form.setEmailError(m.auth_email_invalid())
    }
  }

  return (
    <form onSubmit={onSubmit} aria-busy={form.loading} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{m.auth_name()}</Label>
        <Input
          id="name"
          type="text"
          value={form.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setName(e.target.value)}
          required
          disabled={form.loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{m.auth_email()}</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          required
          disabled={form.loading}
          aria-invalid={form.emailError ? true : undefined}
          aria-describedby={form.emailError ? 'email-error' : undefined}
        />
        {form.emailError && (
          <p id="email-error" className="text-sm text-destructive">
            {form.emailError}
          </p>
        )}
      </div>
      <RegistrationPasswordField
        password={form.password}
        onPasswordChange={form.setPassword}
        loading={form.loading}
      />
      <div className="flex items-start gap-2">
        <Checkbox
          id="accept-terms"
          checked={form.acceptedTerms}
          onCheckedChange={(checked) => form.setAcceptedTerms(checked === true)}
          disabled={form.loading}
        />
        <Label htmlFor="accept-terms" className="text-sm font-normal leading-snug cursor-pointer">
          <span>
            {m.auth_accept_privacy_prefix()}{' '}
            <Link
              to="/legal/confidentialite"
              className="underline hover:text-foreground"
              target="_blank"
            >
              {m.auth_accept_privacy_policy()}
            </Link>{' '}
            {m.auth_accept_terms_and()}{' '}
            <Link to="/legal/cgu" className="underline hover:text-foreground" target="_blank">
              {m.auth_accept_terms_of_service()}
            </Link>
          </span>
        </Label>
      </div>
      <Button type="submit" className="w-full" disabled={form.loading || !form.acceptedTerms}>
        {form.loading ? m.auth_creating_account() : m.auth_create_account_button()}
      </Button>
    </form>
  )
}

function RegistrationForm(props: RegistrationFormProps) {
  return (
    <AuthLayout title={m.auth_register_title()} description={m.auth_register_desc()}>
      {props.form.error && (
        <FormMessage variant="error" className="justify-center">
          {props.form.error}
        </FormMessage>
      )}

      <RegistrationFields form={props.form} onSubmit={props.onSubmit} />

      {props.hasOAuth && (
        <>
          <OrDivider />
          <div
            className={cn(
              'grid gap-2',
              props.providers.google && props.providers.github ? 'grid-cols-2' : 'grid-cols-1'
            )}
          >
            {props.providers.google && (
              <OAuthButton
                provider="google"
                loading={props.form.oauthLoading === 'google'}
                disabled={props.form.loading || props.form.oauthLoading !== null}
                onClick={() => props.onOAuth('google')}
              >
                {m.auth_sign_up_with_google()}
              </OAuthButton>
            )}
            {props.providers.github && (
              <OAuthButton
                provider="github"
                loading={props.form.oauthLoading === 'github'}
                disabled={props.form.loading || props.form.oauthLoading !== null}
                onClick={() => props.onOAuth('github')}
              >
                {m.auth_sign_up_with_github()}
              </OAuthButton>
            )}
          </div>
        </>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {m.auth_have_account()}{' '}
        <Link
          to="/login"
          search={props.redirectParam ? { redirect: props.redirectParam } : undefined}
          className="underline hover:text-foreground"
        >
          {m.auth_sign_in_link()}
        </Link>
      </p>
    </AuthLayout>
  )
}

// ---------------------------------------------------------------------------
// Handlers (module-level async functions — keeps the page component small)
// ---------------------------------------------------------------------------

async function handleRegister(form: RegisterFormState) {
  form.clearErrors()
  if (form.email && !EMAIL_REGEX.test(form.email)) {
    form.setEmailError(m.auth_email_invalid())
    return
  }
  form.setLoading(true)
  try {
    const { error: signUpError } = await authClient.signUp.email({
      name: form.name,
      email: form.email,
      password: form.password,
      // locale is declared in Better Auth's user.additionalFields but the client SDK types
      // don't reflect additional fields in signUp params — the `as` cast is required.
      locale: navigator.language?.split('-')[0] ?? 'en',
    } as Parameters<typeof authClient.signUp.email>[0])
    if (signUpError) {
      // Conscious UX trade-off: revealing that an email is already registered enables account
      // enumeration, but provides a significantly better user experience than a generic error.
      // Mitigated by rate limiting on sign-up.
      if (signUpError.status === 429) {
        form.setError(m.auth_rate_limit())
      } else if (signUpError.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
        form.setError(m.auth_register_email_exists())
      } else {
        form.setError(m.auth_register_unable())
      }
    } else {
      fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          categories: { necessary: true, analytics: false, marketing: false },
          policyVersion: legalConfig.consentPolicyVersion,
          action: 'customized',
        }),
      }).catch(() => {
        /* Consent sync failure is non-critical */
      })
      toast.success(m.auth_toast_account_created())
      form.setMessage(m.auth_check_email_verify())
    }
  } catch {
    toast.error(m.auth_toast_error())
  } finally {
    form.setLoading(false)
  }
}

async function handleOAuth(provider: 'google' | 'github', form: RegisterFormState) {
  form.setOauthLoading(provider)
  try {
    await authClient.signIn.social({ provider })
  } catch {
    toast.error(m.auth_toast_error())
    form.setOauthLoading(null)
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function RegisterPage() {
  const { redirect: redirectParam } = Route.useSearch()
  const providers = Route.useLoaderData()
  const hasOAuth = providers.google || providers.github
  const form = useRegisterFormState()

  if (form.message) {
    return <RegistrationSuccess message={form.message} redirectParam={redirectParam} />
  }

  return (
    <RegistrationForm
      form={form}
      onSubmit={(e: React.FormEvent) => {
        e.preventDefault()
        handleRegister(form)
      }}
      hasOAuth={hasOAuth}
      providers={providers}
      onOAuth={(provider) => handleOAuth(provider, form)}
      redirectParam={redirectParam}
    />
  )
}
