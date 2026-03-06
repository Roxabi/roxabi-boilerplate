import { AnimatedSection, cn, useInView } from '@repo/ui'
import { m } from '@/paraglide/messages'

const skills = () => [
  { name: 'Knowledge Base (BM25 + vec)', level: 12, max: 12 },
  { name: 'Voice (Qwen-fast, Whisper)', level: 8, max: 12 },
  { name: 'Telegram Adapter', level: 12, max: 12 },
  { name: 'Discord Adapter', level: 4, max: 12 },
  { name: 'Session Persistence', level: 12, max: 12 },
  { name: 'Plugin Marketplace (11)', level: 8, max: 12 },
]

function ProgressBar({
  name,
  level,
  max,
  visible,
  delay,
}: {
  name: string
  level: number
  max: number
  visible: boolean
  delay: number
}) {
  const isMax = level === max
  return (
    <div
      role="progressbar"
      aria-label={name}
      aria-valuenow={level}
      aria-valuemin={0}
      aria-valuemax={max}
      className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden"
    >
      <div
        className={`h-full rounded-full transition-all duration-1000 ${isMax ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-500/70 to-emerald-400/70'}`}
        style={{
          width: visible ? `${Math.round((level / max) * 100)}%` : '0%',
          transitionDelay: `${delay}ms`,
        }}
      />
    </div>
  )
}

export function CharacterSheetSection() {
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true })

  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/6 blur-[160px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-6 text-center font-mono text-amber-300">
            {m.talk_ld_sheet_title()}
          </h2>
        </AnimatedSection>

        <div
          ref={ref}
          className={cn(
            'rounded-2xl border-2 border-amber-400/35 overflow-hidden transition-all duration-700',
            'bg-gradient-to-br from-[#0d0b04] via-amber-950/10 to-[#0d0b04]',
            'shadow-[0_0_80px_-20px_rgba(245,158,11,0.2)]',
            inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          )}
        >
          {/* Header */}
          <div className="border-b border-amber-400/20 bg-amber-500/8 px-6 py-4 text-center">
            <p className="font-mono text-lg font-bold tracking-[0.4em] text-amber-300">LYRA</p>
            <p className="font-mono text-xs text-amber-400/60 mt-0.5 italic">
              {m.talk_ld_sheet_subtitle()}
            </p>
          </div>

          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-amber-400/10">
            {/* Left: stats + traits */}
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'CLASS', value: m.talk_ld_sheet_class() },
                { label: 'LEVEL', value: m.talk_ld_sheet_level() },
                { label: 'SERVER', value: m.talk_ld_sheet_server() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="font-mono text-[9px] tracking-widest text-amber-400/50 uppercase">
                    {label}
                  </p>
                  <p className="font-mono text-sm text-amber-100/80 mt-0.5">{value}</p>
                </div>
              ))}

              <div className="border-t border-amber-400/10 pt-4">
                <p className="font-mono text-[9px] tracking-widest text-amber-400/50 uppercase mb-2">
                  {m.talk_ld_sheet_traits()}
                </p>
                {[m.talk_ld_sheet_trait1(), m.talk_ld_sheet_trait2(), m.talk_ld_sheet_trait3()].map(
                  (t) => (
                    <div key={t} className="flex items-start gap-2 mb-1.5">
                      <div className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-amber-400/50" />
                      <p className="font-mono text-xs text-muted-foreground/70">{t}</p>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Right: skills */}
            <div className="px-6 py-5">
              <p className="font-mono text-[9px] tracking-widest text-amber-400/50 uppercase mb-4">
                {m.talk_ld_sheet_skills()}
              </p>
              <div className="space-y-4">
                {skills().map(({ name, level, max }, i) => (
                  <div key={name}>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-xs text-muted-foreground/70">{name}</span>
                      <span
                        className={`font-mono text-xs font-bold ${level === max ? 'text-amber-400' : 'text-muted-foreground'}`}
                      >
                        {level === max ? 'MAX' : `${level}/${max}`}
                      </span>
                    </div>
                    <ProgressBar
                      name={name}
                      level={level}
                      max={max}
                      visible={inView}
                      delay={200 + i * 100}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
