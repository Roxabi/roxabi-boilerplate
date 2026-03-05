import {
  AnimatedSection,
  Badge,
  Card,
  CardContent,
  cn,
  useInView,
  useReducedMotion,
} from '@repo/ui'
import { AlertTriangle, ArrowRight, Zap } from 'lucide-react'
import { m } from '@/paraglide/messages'

export function BreakingThingsSection() {
  const reducedMotion = useReducedMotion()
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true })
  const visible = inView || reducedMotion

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-red-500/5 blur-[100px] dark:bg-red-500/8" />
        <div className="absolute right-0 bottom-1/4 h-[300px] w-[300px] translate-x-1/4 rounded-full bg-blue-500/5 blur-[80px] dark:bg-blue-500/10" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2">
            {m.talk_ls_breaking_title()}
          </h2>
          <p className="text-lg text-muted-foreground">{m.talk_ls_breaking_subtitle()}</p>
        </AnimatedSection>

        {/* Before / After cards */}
        <div ref={ref} className="mt-12 grid gap-4 md:grid-cols-2">
          {/* Before — MCP */}
          <div
            className={cn(
              'transition-all duration-700',
              visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            )}
          >
            <Card
              variant="subtle"
              className="h-full border border-red-500/20 bg-red-500/5 dark:bg-red-500/5"
            >
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    {m.talk_ls_breaking_mcp_label()}
                  </span>
                </div>
                <p className="text-muted-foreground">{m.talk_ls_breaking_mcp_desc()}</p>
                <div className="text-xs font-mono text-red-400/70">Days 1 → 5</div>
              </CardContent>
            </Card>
          </div>

          <div className="hidden md:flex items-center justify-center">
            <ArrowRight
              className={cn(
                'h-8 w-8 text-blue-400/50 transition-all duration-500',
                visible ? 'opacity-100' : 'opacity-0'
              )}
              style={{ transitionDelay: visible ? '300ms' : '0ms' }}
            />
          </div>

          {/* After — Python direct */}
          <div
            className={cn(
              'transition-all duration-700 md:col-start-2',
              visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            )}
            style={{ transitionDelay: visible ? '200ms' : '0ms' }}
          >
            <Card
              variant="subtle"
              className="h-full border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/5"
            >
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    {m.talk_ls_breaking_day5_label()}
                  </span>
                </div>
                <p className="text-muted-foreground">{m.talk_ls_breaking_day5_desc()}</p>
                <div className="text-xs font-mono text-blue-400/70">Day 5 → reset</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <AnimatedSection className="mt-10">
          <blockquote className="border-l-2 border-blue-500/40 pl-6">
            <p className="text-xl italic text-muted-foreground lg:text-2xl">
              "{m.talk_ls_breaking_lesson()}"
            </p>
          </blockquote>
        </AnimatedSection>

        <AnimatedSection className="mt-8 flex flex-wrap gap-3">
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20">
            {m.talk_ls_breaking_xp()}
          </Badge>
          <Badge variant="secondary" className="text-muted-foreground">
            {m.talk_ls_breaking_skill()}
          </Badge>
        </AnimatedSection>
      </div>
    </div>
  )
}
