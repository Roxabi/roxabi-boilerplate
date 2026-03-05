import { AnimatedSection, Badge, Card, CardContent, cn } from '@repo/ui'
import { GitCommit, RefreshCw, Trash2 } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { useSlideReveal } from './useSlideReveal'

export function LettingGoSection() {
  const { ref, visible } = useSlideReveal()

  const refactorTexts = [
    m.talk_ls_letting_go_refactor1(),
    m.talk_ls_letting_go_refactor2(),
    m.talk_ls_letting_go_refactor3(),
    m.talk_ls_letting_go_refactor4(),
  ]

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      {/* Background glows — falling/fading feel */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-1/3 top-0 h-[300px] w-[300px] -translate-y-1/4 rounded-full bg-purple-500/5 blur-[90px] dark:bg-purple-500/10" />
        <div className="absolute left-1/4 bottom-0 h-[350px] w-[350px] translate-y-1/4 rounded-full bg-blue-500/5 blur-[100px] dark:bg-blue-500/10" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2">
            {m.talk_ls_letting_go_title()}
          </h2>
          <p className="text-lg text-muted-foreground">{m.talk_ls_letting_go_subtitle()}</p>
        </AnimatedSection>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* linkedin-jobs deletion */}
          <AnimatedSection>
            <Card variant="subtle" className="border border-red-500/20 bg-red-500/5">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-red-400">
                  <Trash2 className="h-4 w-4" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    {m.talk_ls_letting_go_linkedin_label()}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {m.talk_ls_letting_go_linkedin_desc()}
                </p>
                <div className="flex items-center gap-2 text-xs font-mono text-red-400/60">
                  <GitCommit className="h-3 w-3" />
                  cfa0ce3
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* 4 refactors */}
          <div>
            <AnimatedSection>
              <div className="flex items-center gap-2 mb-4 text-blue-400">
                <RefreshCw className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-wider">
                  {m.talk_ls_letting_go_refactor_label()}
                </p>
              </div>
            </AnimatedSection>
            <div ref={ref} className="space-y-3">
              {refactorTexts.map((text, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static ordered refactor steps
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border border-border/50 bg-background/30 px-4 py-3 text-sm transition-all duration-600',
                    visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
                  )}
                  style={{ transitionDelay: visible ? `${index * 100}ms` : '0ms' }}
                >
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xs text-blue-400 font-bold">
                    {index + 1}
                  </div>
                  <span className="text-muted-foreground font-mono text-xs">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <AnimatedSection className="mt-10">
          <blockquote className="text-center">
            <p className="text-xl italic text-muted-foreground lg:text-2xl">
              "{m.talk_ls_letting_go_rule()}"
            </p>
          </blockquote>
        </AnimatedSection>

        <AnimatedSection className="mt-8 flex flex-wrap gap-3 justify-center">
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30">
            {m.talk_ls_letting_go_xp()}
          </Badge>
          <Badge variant="secondary" className="text-muted-foreground">
            {m.talk_ls_letting_go_trait()}
          </Badge>
        </AnimatedSection>
      </div>
    </div>
  )
}
