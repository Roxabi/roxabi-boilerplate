import { AnimatedSection, Badge } from '@repo/ui'
import { m } from '@/paraglide/messages'

export function SharedFoundationSection() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-amber-500/6 blur-[120px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-amber-400 uppercase">
            {m.talk_lp_foundation_date()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-6 font-mono text-amber-300">
            {m.talk_lp_foundation_title()}
          </h2>
        </AnimatedSection>

        <AnimatedSection className="mt-4">
          <div className="flex items-center gap-4 max-w-xl">
            {/* Before */}
            <div className="flex-1 rounded-lg border border-rose-400/30 bg-rose-500/5 p-5 text-center">
              <p className="font-mono text-xs text-rose-400/60 uppercase tracking-wider mb-2">
                {m.talk_lp_foundation_before_label()}
              </p>
              <p className="font-mono text-3xl font-bold text-rose-300 line-through opacity-70">
                240
              </p>
              <p className="font-mono text-xs text-rose-400/50 mt-1">lines / script</p>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="font-mono text-amber-400 text-xl">→</span>
            </div>

            {/* After */}
            <div className="flex-1 rounded-lg border border-amber-400/30 bg-amber-500/8 p-5 text-center">
              <p className="font-mono text-xs text-amber-400/60 uppercase tracking-wider mb-2">
                {m.talk_lp_foundation_after_label()}
              </p>
              <p className="font-mono text-3xl font-bold text-amber-300">10</p>
              <p className="font-mono text-xs text-amber-400/50 mt-1">lines / script</p>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-6">
          <Badge className="border border-amber-400/50 bg-amber-500/10 text-amber-300 font-mono text-[10px] tracking-widest">
            {m.talk_lp_foundation_label()}
          </Badge>
        </AnimatedSection>

        <AnimatedSection className="mt-4">
          <p className="max-w-xl text-base text-muted-foreground/70 leading-relaxed">
            {m.talk_lp_foundation_body()}
          </p>
        </AnimatedSection>

        <AnimatedSection className="mt-8">
          <div className="flex items-start gap-3 max-w-xl">
            <Badge className="mt-0.5 flex-shrink-0 border border-amber-400/50 bg-amber-500/10 text-amber-300 font-mono text-[9px] tracking-widest uppercase">
              {m.talk_lp_foundation_lesson_label()}
            </Badge>
            <p className="text-lg font-semibold text-amber-200/90 italic leading-snug">
              &ldquo;{m.talk_lp_foundation_lesson()}&rdquo;
            </p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}
