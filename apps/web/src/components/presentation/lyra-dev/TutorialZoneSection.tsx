import { AnimatedSection, Badge } from '@repo/ui'
import { m } from '@/paraglide/messages'

export function TutorialZoneSection() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 bottom-0 h-[300px] w-[300px] -translate-x-1/4 translate-y-1/4 rounded-full bg-red-500/8 blur-[100px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-red-400 uppercase">
            {m.talk_ld_tutorial_date()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-4 font-mono text-red-300">
            {m.talk_ld_tutorial_title()}
          </h2>
        </AnimatedSection>

        <AnimatedSection className="mt-2">
          <p className="text-base text-muted-foreground/80 italic max-w-2xl">
            {m.talk_ld_tutorial_intro()}
          </p>
        </AnimatedSection>

        <AnimatedSection className="mt-8">
          <div className="rounded-xl border border-red-400/25 bg-red-500/5 px-6 py-5 max-w-2xl">
            <p className="font-mono text-sm text-red-200/80 leading-relaxed">
              {m.talk_ld_tutorial_problem()}
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-6">
          <div className="flex items-start gap-3 max-w-2xl">
            <Badge className="mt-0.5 flex-shrink-0 border border-amber-400/50 bg-amber-500/10 text-amber-300 font-mono text-[9px] tracking-widest uppercase">
              {m.talk_ld_tutorial_lesson_label()}
            </Badge>
            <blockquote className="border-l-2 border-amber-500/50 pl-4">
              <p className="text-lg font-semibold text-amber-200/90 italic leading-snug">
                &ldquo;{m.talk_ld_tutorial_lesson()}&rdquo;
              </p>
            </blockquote>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-8">
          <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/5 px-6 py-4 max-w-2xl">
            <p className="font-mono text-sm text-emerald-300/80">{m.talk_ld_tutorial_reset()}</p>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-6">
          <p className="font-mono text-[10px] tracking-widest text-emerald-400/70 uppercase">
            {m.talk_ld_tutorial_xp()}
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}
