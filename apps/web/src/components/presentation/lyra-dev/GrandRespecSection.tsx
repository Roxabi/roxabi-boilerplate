import { AnimatedSection } from '@repo/ui'
import { m } from '@/paraglide/messages'

const respecSteps = () => [
  m.talk_ld_respec_1(),
  m.talk_ld_respec_2(),
  m.talk_ld_respec_3(),
  m.talk_ld_respec_4(),
]

export function GrandRespecSection() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/6 blur-[140px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-red-400 uppercase">
            {m.talk_ld_respec_date()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-4 font-mono text-red-300">
            {m.talk_ld_respec_title()}
          </h2>
          <p className="text-base text-muted-foreground/70 italic max-w-2xl">
            {m.talk_ld_respec_intro()}
          </p>
        </AnimatedSection>

        <AnimatedSection className="mt-8">
          <div className="space-y-3 max-w-lg">
            {respecSteps().map((step, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static ordered respec steps
              <div key={i} className="flex items-center gap-4">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-red-400/30 bg-red-500/10">
                  <span className="font-mono text-[10px] font-bold text-red-400">{i + 1}</span>
                </div>
                <div className="h-px flex-1 border-t border-dashed border-red-400/20" />
                <div className="rounded-lg border border-red-400/20 bg-red-500/5 px-4 py-2.5 flex-[3]">
                  <p className="font-mono text-sm text-red-200/80">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-8">
          <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/5 px-5 py-4 max-w-lg">
            <p className="font-mono text-sm text-emerald-300/80 leading-relaxed">
              {m.talk_ld_respec_truth()}
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-5">
          <p className="font-mono text-[10px] tracking-widest text-emerald-400/70 uppercase">
            {m.talk_ld_respec_xp()} &nbsp;·&nbsp; {m.talk_ld_respec_trait()}
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}
