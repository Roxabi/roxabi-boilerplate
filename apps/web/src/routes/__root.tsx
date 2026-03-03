import type { ConsentCookiePayload } from '@repo/types'
import { Toaster } from '@repo/ui'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Scripts,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import { ErrorBoundary } from 'react-error-boundary'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { TanStackQueryDevtools } from '../integrations/tanstack-query/devtools'
import { ConsentProvider } from '../lib/consent/consentProvider'
import { getServerConsent } from '../lib/consent/server'
import type { EnrichedSession } from '../lib/routePermissions'
import { getServerEnrichedSession } from '../lib/routePermissions'
import appCss from '../styles.css?url'

export type MyRouterContext = {
  queryClient: QueryClient
  serverConsent: ConsentCookiePayload | null
  session: EnrichedSession | null
}

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown
  resetErrorBoundary: () => void
}) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md p-8 bg-card rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold text-destructive mb-4">
          {m.error_something_went_wrong()}
        </h2>
        <p className="text-muted-foreground mb-4">{message}</p>
        <button
          type="button"
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          {m.error_try_again()}
        </button>
      </div>
    </div>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async (ctx) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', getLocale())
    }
    // Skip session fetch on chromeless public routes (/docs, /talks) — they
    // have no header and no permission guards, so a 401 from the API would
    // just be log noise with no functional impact.
    const isPublic = CHROMELESS_PREFIXES.some((p) => ctx.location.pathname.startsWith(p))
    // Run session + consent fetches in parallel. getServerConsent is wrapped in
    // try/catch because a missing/malformed cookie is non-fatal — the banner
    // falls back to showing and the client-side useEffect handles recovery.
    // Both values are returned into the router context so that shellComponent
    // (RootDocument → AppShell) can read them via useRouteContext() before the
    // first SSR pixel is painted (loader data is NOT available in shellComponent).
    const [session, serverConsent] = await Promise.all([
      isPublic ? null : getServerEnrichedSession(),
      getServerConsent().catch(() => null),
    ])
    return { session, serverConsent }
  },

  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Roxabi',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-bold text-muted-foreground">{m.error_page_not_found_title()}</h1>
      <p className="mt-4 text-xl text-muted-foreground">{m.error_page_not_found_description()}</p>
      <Link to="/" className="mt-6 text-primary underline underline-offset-4 hover:text-primary/80">
        {m.error_go_home()}
      </Link>
    </div>
  )
}

// Routes under these prefixes skip the app shell (nav, consent banner, etc.) and session enforcement.
// Invariant: no route under these prefixes may call enforceRoutePermission — they are public by design.
const CHROMELESS_PREFIXES = ['/docs', '/talks'] as const

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isChromeless = CHROMELESS_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  // Read serverConsent from beforeLoad context — NOT from useLoaderData().
  // shellComponent (RootDocument → AppShell) renders before loader data is available,
  // so useLoaderData() always returns undefined here. beforeLoad context IS available.
  // See ADR-004 for the full rationale.
  const { serverConsent = null } = Route.useRouteContext()

  return (
    <RootProvider>
      <ConsentProvider initialConsent={serverConsent}>
        <div className="flex min-h-screen flex-col">
          {!isChromeless && <Header />}
          <div className="flex-1">
            <ErrorBoundary FallbackComponent={ErrorFallback}>{children}</ErrorBoundary>
          </div>
          {!isChromeless && <Footer />}
        </div>
        <Toaster richColors position="bottom-right" offset="4rem" />
      </ConsentProvider>
    </RootProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <AppShell>{children}</AppShell>
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
