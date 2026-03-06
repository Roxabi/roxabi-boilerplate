import { AnimatedSection, Badge } from '@repo/ui'
import { m } from '@/paraglide/messages'

const timeline = () => [
  { time: '00:14', text: m.talk_ld_awak_phase1(), phase: 1 },
  { time: '00:50', text: m.talk_ld_awak_phase2(), phase: 1 },
  { time: '01:24', text: m.talk_ld_awak_phase3(), phase: 2 },
  { time: '01:47', text: m.talk_ld_awak_phase4(), phase: 2 },
  { time: '08:26', text: m.talk_ld_awak_morning(), phase: 3 },
  { time: '22:24', text: m.talk_ld_awak_climax(), phase: 3 },
]

export function AwakeningNightSection() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      {/* Deep dark glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-950/60 blur-[180px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-red-400 uppercase">
            {m.talk_ld_awak_date()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2 font-mono text-red-300">
            {m.talk_ld_awak_title()}
          </h2>
          <div className="flex items-center gap-2 mb-6">
            <Badge className="border border-red-400/60 bg-red-500/15 text-red-300 font-mono text-[9px] tracking-widest uppercase">
              {m.talk_ld_awak_boss()}
            </Badge>
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <div className="space-y-2 max-w-xl">
            {timeline().map(({ time, text, phase }) => (
              <div key={time} className="flex items-start gap-4">
                <span className="w-12 flex-shrink-0 font-mono text-xs text-red-400/60 pt-1">
                  {time}
                </span>
                <div className="flex-1 flex items-start gap-3">
                  <div
                    className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                      phase === 3 ? 'bg-amber-400' : phase === 2 ? 'bg-red-400' : 'bg-red-400/50'
                    }`}
                  />
                  <p
                    className={`font-mono text-sm leading-snug ${
                      phase === 3 ? 'text-amber-200/90 font-semibold' : 'text-red-200/70'
                    }`}
                  >
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-7">
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 px-5 py-4 max-w-xl">
            <p className="font-mono text-sm text-amber-200/80 italic leading-relaxed">
              {m.talk_ld_awak_insight()}
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-5">
          <p className="font-mono text-[10px] tracking-widest text-amber-400/70 uppercase">
            {m.talk_ld_awak_xp()} &nbsp;·&nbsp; {m.talk_ld_awak_achievement()}
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}
