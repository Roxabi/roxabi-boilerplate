import { Badge, Button } from '@repo/ui'
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import { GITHUB_REPO_URL } from '@/lib/config'
import { clientEnv } from '@/lib/env.shared'
import { m } from '@/paraglide/messages'

// --- Terminal Feed ---

const TERMINAL_LINES = [
  { id: 'cmd-dev', type: 'cmd', text: '$ bun run dev' },
  { id: 'info-web', type: 'info', text: '  web    ready on :3000' },
  { id: 'info-api', type: 'info', text: '  api    ready on :4000' },
  { id: 'success-compiled', type: 'success', text: '  \u2713 compiled in 342ms' },
  { id: 'cmd-typecheck', type: 'cmd', text: '$ bun run typecheck' },
  { id: 'success-no-errors', type: 'success', text: '  \u2713 0 errors' },
  { id: 'cmd-test', type: 'cmd', text: '$ bun run test' },
  { id: 'success-tests', type: 'success', text: '  \u2713 47 tests passed' },
  { id: 'cmd-push', type: 'cmd', text: '$ git push origin feat/auth' },
  { id: 'info-pr-created', type: 'info', text: '  \u2192 PR #42 auto-created' },
  { id: 'info-review-req', type: 'info', text: '  \u2192 Review requested' },
  { id: 'ai-review', type: 'ai', text: '  \u27f3 AI review running...' },
  { id: 'success-review', type: 'success', text: '  \u2713 Code review approved' },
  { id: 'cmd-migrate', type: 'cmd', text: '$ bun run db:migrate' },
  { id: 'success-migrations', type: 'success', text: '  \u2713 migrations applied' },
  { id: 'cmd-deploy', type: 'cmd', text: '$ vercel deploy --prod' },
  { id: 'success-deployed', type: 'success', text: '  \u2713 deployed in 28s' },
  { id: 'info-url', type: 'info', text: '  \u2192 https://app.yourdomain.com' },
] as const

type LineType = (typeof TERMINAL_LINES)[number]['type']

function lineClass(type: LineType): string {
  switch (type) {
    case 'cmd':
      return 'text-zinc-100'
    case 'info':
      return 'text-zinc-400 dark:text-zinc-500'
    case 'success':
      return 'text-emerald-400'
    case 'ai':
      return 'text-indigo-400 motion-safe:animate-pulse'
  }
}

function TerminalFeed() {
  return (
    <div className="overflow-hidden h-full">
      <div className="terminal-scroll">
        {[...TERMINAL_LINES, ...TERMINAL_LINES].map((line, i) => (
          <div
            key={`${i < TERMINAL_LINES.length ? 0 : 1}-${line.id}`}
            className={`font-mono text-xs leading-6 ${lineClass(line.type)}`}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Floating Cards ---

type ActivityItem =
  | { type: 'done'; label: string; time: string }
  | { type: 'running'; label: string }

const ACTIVITY_ITEMS: ActivityItem[] = [
  { type: 'done', label: 'feat/auth reviewed', time: '2s ago' },
  { type: 'running', label: 'running tests...' },
  { type: 'done', label: 'PR #42 approved', time: '1m ago' },
]

function AgentActivityCard() {
  return (
    <div
      className="absolute -left-4 top-8 z-20 w-56 rounded-xl border border-border/60 bg-background/90 p-3 shadow-lg backdrop-blur-md dark:bg-zinc-900/90"
      aria-hidden="true"
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 fill-primary" aria-hidden="true">
          <path d="M12 2 L20.66 7 L20.66 17 L12 22 L3.34 17 L3.34 7 Z" />
        </svg>
        AI Team Activity
      </p>
      <ul className="space-y-1.5">
        {ACTIVITY_ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-xs">
            {item.type === 'done' ? (
              <>
                <CheckCircle2 className="size-3 shrink-0 text-emerald-500" aria-hidden="true" />
                <span className="flex-1 truncate text-foreground/80">{item.label}</span>
                <span className="shrink-0 text-muted-foreground/60">{item.time}</span>
              </>
            ) : (
              <>
                <Loader2
                  className="size-3 shrink-0 motion-safe:animate-spin text-primary"
                  aria-hidden="true"
                />
                <span className="flex-1 truncate text-muted-foreground">{item.label}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CodeSnippetCard() {
  return (
    <div
      className="absolute -right-4 bottom-10 z-20 rounded-lg border border-zinc-800 bg-zinc-950/95 p-3 shadow-lg backdrop-blur-md"
      aria-hidden="true"
    >
      <pre className="font-mono text-xs leading-relaxed text-zinc-300">
        <span className="text-indigo-400">const</span>
        <span className="text-zinc-100"> app</span>
        <span className="text-zinc-500"> = </span>
        <span className="text-yellow-300">await</span>
        {'\n'}
        {'  '}
        <span className="text-sky-400">bootstrap</span>
        <span className="text-zinc-500">{'('}</span>
        {'\n'}
        {'    '}
        <span className="text-emerald-400">AppModule</span>
        {'\n'}
        {'  '}
        <span className="text-zinc-500">{')'}</span>
      </pre>
    </div>
  )
}

function FeatureChip() {
  return (
    <div
      className="absolute right-6 top-4 z-20 flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 shadow-sm backdrop-blur-sm dark:text-emerald-400"
      aria-hidden="true"
    >
      <span className="size-1.5 rounded-full bg-emerald-500" />
      TypeSafe · Full-Stack
    </div>
  )
}

// --- Hero Section ---

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] overflow-hidden">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-[150px] dark:bg-primary/18" />
        <div className="absolute bottom-0 right-0 h-[350px] w-[350px] translate-x-1/4 translate-y-1/4 rounded-full bg-chart-1/6 blur-[100px] dark:bg-chart-1/12" />
        {/* Grilled grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative mx-auto flex h-full max-w-7xl items-center px-6 py-28">
        {/* Left — text content */}
        <div className="relative z-10 flex-1 lg:pr-16">
          <div className="animate-hero-in">
            <Badge
              variant="secondary"
              className="mb-6 inline-flex border border-primary/20 bg-primary/5 text-primary dark:bg-primary/10"
            >
              {m.hero_badge()}
            </Badge>

            <h1 className="max-w-2xl text-5xl font-bold text-balance sm:text-6xl lg:text-7xl tracking-[-0.03em] leading-[1.08]">
              {m.hero_title()}
            </h1>

            <p className="mt-8 max-w-md text-lg leading-relaxed text-muted-foreground/80">
              {m.hero_subtitle()}
            </p>
          </div>

          <div className="animate-hero-in-delayed mt-12 flex items-center gap-4">
            <Button
              size="lg"
              className="shadow-[0_0_24px_rgba(99,102,241,0.35)] transition-all duration-200 hover:shadow-[0_0_40px_rgba(99,102,241,0.55)]"
              asChild
            >
              <a href={clientEnv.VITE_DOCS_URL ?? '#'} target="_blank" rel="noopener noreferrer">
                {m.hero_cta_start()}
              </a>
            </Button>
            <Button variant="outline" size="lg" className="transition-all duration-200" asChild>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                {m.hero_cta_github()}
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>

          {/* Stats row */}
          <div className="animate-hero-in-delayed mt-16 flex max-w-xl flex-col gap-6 sm:flex-row sm:gap-0 sm:divide-x sm:divide-border">
            <div className="text-center sm:flex-1 sm:pr-6">
              <p className="text-3xl font-bold tracking-tight">{m.stat_setup()}</p>
              <p className="mt-1 text-sm text-muted-foreground/70">{m.stat_setup_label()}</p>
            </div>
            <div className="text-center sm:flex-1 sm:px-6">
              <p className="text-3xl font-bold tracking-tight">{m.stat_config()}</p>
              <p className="mt-1 text-sm text-muted-foreground/70">{m.stat_config_label()}</p>
            </div>
            <div className="text-center sm:flex-1 sm:pl-6">
              <p className="text-3xl font-bold tracking-tight">{m.stat_production()}</p>
              <p className="mt-1 text-sm text-muted-foreground/70">{m.stat_production_label()}</p>
            </div>
          </div>
        </div>

        {/* Right — terminal feed panel with floating cards */}
        <div
          className="animate-hero-in-delayed relative hidden lg:block lg:w-[420px] xl:w-[480px] overflow-visible aspect-[1/1.1]"
          aria-hidden="true"
        >
          {/* Floating cards */}
          <AgentActivityCard />
          <FeatureChip />
          <CodeSnippetCard />

          {/* Terminal panel */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl border border-border/40 bg-[var(--color-terminal-bg)] px-4 py-4">
            {/* Fade top and bottom */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-12 z-10 bg-gradient-to-b from-[var(--color-terminal-bg)] to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 z-10 bg-gradient-to-t from-[var(--color-terminal-bg)] to-transparent" />
            {/* Terminal content */}
            <TerminalFeed />
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-zinc-800/60" />
          </div>
        </div>
      </div>
    </section>
  )
}
