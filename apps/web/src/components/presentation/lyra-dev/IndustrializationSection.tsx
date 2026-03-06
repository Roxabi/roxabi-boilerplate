import { AnimatedSection } from '@repo/ui'
import { m } from '@/paraglide/messages'

const mechanics = () => [
  m.talk_ld_indus_rule1(),
  m.talk_ld_indus_rule2(),
  m.talk_ld_indus_rule3(),
  m.talk_ld_indus_rule4(),
]

export function IndustrializationSection() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-[350px] w-[350px] translate-x-1/3 -translate-y-1/4 rounded-full bg-emerald-500/8 blur-[120px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-emerald-400 uppercase">
            {m.talk_ld_indus_date()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-6 font-mono text-emerald-300">
            {m.talk_ld_indus_title()}
          </h2>
        </AnimatedSection>

        {/* Stats banner */}
        <AnimatedSection>
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 px-6 py-5 max-w-md">
            <p className="font-mono text-2xl font-bold text-emerald-300 tracking-tight">
              {m.talk_ld_indus_commits()}
            </p>
            <p className="mt-1 font-mono text-[9px] tracking-widest text-emerald-400/50 uppercase">
              FULL GRIND MODE
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-8">
          <div className="max-w-2xl">
            <p className="mb-4 font-mono text-[9px] tracking-widest text-emerald-400 uppercase">
              {m.talk_ld_indus_rule_label()}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {mechanics().map((mechanic, i) => (
                <div
                  key={mechanic}
                  className="flex items-start gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-4 py-3"
                >
                  <span className="mt-0.5 flex-shrink-0 font-mono text-[9px] text-emerald-400/50">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="font-mono text-sm text-emerald-200/80">{mechanic}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-6">
          <div className="rounded-xl border border-amber-400/25 bg-amber-500/5 px-5 py-4 max-w-2xl">
            <p className="font-mono text-[9px] tracking-widest text-amber-400/60 uppercase mb-1">
              MILESTONE
            </p>
            <p className="font-mono text-sm text-amber-200/80">{m.talk_ld_indus_milestone()}</p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}
