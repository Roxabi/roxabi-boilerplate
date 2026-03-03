import { AnimatedSection, Card, cn } from '@repo/ui'
import { Link } from '@tanstack/react-router'
import { BookMarked, BookOpen, GitFork, Package } from 'lucide-react'
import type { ComponentType } from 'react'
import { m } from '@/paraglide/messages'

type CtaCard = {
  id: string
  icon: ComponentType<{ className?: string }>
  label: () => string
  description: () => string
  href?: string
  splat?: string
  external?: boolean
}

const ctas: ReadonlyArray<CtaCard> = [
  {
    id: 'docs',
    icon: BookOpen,
    label: m.talk_dp_closing_docs,
    description: m.talk_dp_closing_docs_desc,
    href: '/docs/$',
    splat: '',
  },
  {
    id: 'fork',
    icon: GitFork,
    label: m.talk_dp_closing_fork,
    description: m.talk_dp_closing_fork_desc,
    href: 'https://github.com/MickaelV0/roxabi_boilerplate',
    external: true,
  },
  {
    id: 'plugins-official',
    icon: Package,
    label: m.talk_dp_closing_plugins_official,
    description: m.talk_dp_closing_plugins_official_desc,
    href: 'https://github.com/anthropics/claude-plugins-official',
    external: true,
  },
  {
    id: 'plugins-knowledge',
    icon: BookMarked,
    label: m.talk_dp_closing_plugins_knowledge,
    description: m.talk_dp_closing_plugins_knowledge_desc,
    href: 'https://github.com/anthropics/knowledge-work-plugins',
    external: true,
  },
]

function CtaCardItem({ cta }: { cta: CtaCard }) {
  const content = (
    <Card
      variant="subtle"
      className={cn(
        'group flex h-full flex-col items-center gap-4 p-8 text-center transition-colors',
        cta.href && 'cursor-pointer hover:border-primary/30'
      )}
    >
      <div className="rounded-xl bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
        <cta.icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="text-base font-semibold">{cta.label()}</p>
        <p className="mt-1 text-sm text-muted-foreground">{cta.description()}</p>
      </div>
    </Card>
  )

  if (cta.external) {
    return (
      <a href={cta.href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {content}
      </a>
    )
  }

  if (cta.href && cta.splat !== undefined) {
    return (
      <Link to={cta.href} params={{ _splat: cta.splat }} className="block h-full">
        {content}
      </Link>
    )
  }

  return <div className="h-full">{content}</div>
}

export function ClosingSection() {
  return (
    <div className="relative mx-auto max-w-7xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px] dark:bg-primary/10" />
      </div>

      <AnimatedSection>
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl">
            {m.talk_dp_closing_title()}
          </h2>
        </div>
      </AnimatedSection>

      <AnimatedSection className="mt-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ctas.map((cta) => (
            <CtaCardItem key={cta.id} cta={cta} />
          ))}
        </div>
      </AnimatedSection>
    </div>
  )
}
