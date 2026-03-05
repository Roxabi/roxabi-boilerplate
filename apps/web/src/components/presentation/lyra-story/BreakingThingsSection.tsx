import { AnimatedSection, Badge, Card, CardContent, cn } from '@repo/ui'
import { AlertTriangle, ArrowRight, Zap } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'
import { useSlideReveal } from './useSlideReveal'

function BreakingThingsSectionRpg() {
  return (
    <div className="relative mx-auto max-w-5xl w-full">
      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 text-sm font-mono text-red-400 tracking-widest uppercase rpg-pixel text-[10px] rpg-zone-enter">
            {m.talk_ls_rpg_breaking_zone()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2 rpg-pixel leading-tight text-red-300">
            {m.talk_ls_rpg_breaking_warning()}
          </h2>
          <div className="mt-3 inline-block rounded border border-red-500/60 bg-red-500/15 px-3 py-1">
            <span className="rpg-pixel text-[8px] text-red-400 rpg-blink">⚠ ZONE FAILED</span>
          </div>
        </AnimatedSection>

        {/* XP penalty → recovery display */}
        <AnimatedSection className="mt-10">
          <Card
            variant="subtle"
            className="border border-red-500/40 bg-red-500/8"
            style={{ boxShadow: '0 0 30px rgba(220,20,60,0.15)' }}
          >
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-10">
                <div className="text-center">
                  <p className="rpg-pixel text-2xl text-red-400">
                    {m.talk_ls_rpg_breaking_penalty()}
                  </p>
                  <p className="mt-1 text-xs text-red-400/60 uppercase tracking-widest">XP LOST</p>
                </div>
                <ArrowRight className="h-8 w-8 text-yellow-400/60 rotate-90 sm:rotate-0" />
                <div className="text-center">
                  <p className="rpg-pixel text-2xl text-yellow-300">
                    {m.talk_ls_rpg_breaking_recovery()}
                  </p>
                  <p className="mt-1 text-xs text-yellow-400/60 uppercase tracking-widest">
                    XP GAINED
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* SKILL UNLOCKED notification */}
        <AnimatedSection className="mt-8">
          <Card
            variant="subtle"
            className="border border-emerald-500/40 bg-emerald-500/8 max-w-sm mx-auto rpg-achievement"
            style={{ boxShadow: '0 0 20px rgba(80,200,120,0.2)' }}
          >
            <CardContent className="pt-5 pb-5 flex items-center gap-3">
              <Zap className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="rpg-pixel text-[10px] text-emerald-300 uppercase tracking-widest">
                  SKILL UNLOCKED
                </p>
                <p className="mt-1 text-sm text-emerald-200/80">{m.talk_ls_rpg_breaking_skill()}</p>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        <AnimatedSection className="mt-8">
          <blockquote className="border-l-2 border-yellow-500/40 pl-6">
            <p className="text-xl italic text-yellow-200/70 lg:text-2xl">
              "{m.talk_ls_rpg_breaking_lesson()}"
            </p>
          </blockquote>
        </AnimatedSection>
      </div>
    </div>
  )
}

export function BreakingThingsSection() {
  const { isRpg } = useLyraMode()
  const { ref, visible } = useSlideReveal()

  if (isRpg) return <BreakingThingsSectionRpg />

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
              <CardContent className="pt-6 pb-6 space-y-3">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    {m.talk_ls_breaking_mcp_label()}
                  </span>
                </div>
                <p className="text-muted-foreground">{m.talk_ls_breaking_mcp_desc()}</p>
                <div className="text-xs font-mono text-red-400/70">
                  {m.talk_ls_breaking_timeline_before()}
                </div>
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
              className="h-full border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/5"
            >
              <CardContent className="pt-6 pb-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    {m.talk_ls_breaking_day5_label()}
                  </span>
                </div>
                <p className="text-muted-foreground">{m.talk_ls_breaking_day5_desc()}</p>
                <div className="text-xs font-mono text-emerald-400/70">
                  {m.talk_ls_breaking_timeline_after()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <AnimatedSection className="mt-10">
          <blockquote className="border-l-2 border-emerald-500/40 pl-6">
            <p className="text-xl italic text-muted-foreground lg:text-2xl">
              "{m.talk_ls_breaking_lesson()}"
            </p>
          </blockquote>
        </AnimatedSection>

        <AnimatedSection className="mt-8 flex flex-wrap gap-3">
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20">
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
