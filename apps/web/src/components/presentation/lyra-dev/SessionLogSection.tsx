import { AnimatedSection } from '@repo/ui'
import { m } from '@/paraglide/messages'

// Normalised to 20 bars, values represent relative intensity (0-38 sessions on 1er mars)
const sessions = [
  { date: '02 fév', sessions: 20, msgs: 105, highlight: false },
  { date: '03 fév', sessions: 12, msgs: 44, highlight: false },
  { date: '21 fév', sessions: 6, msgs: 26, highlight: false },
  { date: '28 fév', sessions: 9, msgs: 49, highlight: false },
  { date: '01 mar', sessions: 38, msgs: 266, highlight: true },
  { date: '02 mar', sessions: 21, msgs: 123, highlight: false },
  { date: '03 mar', sessions: 12, msgs: 68, highlight: false },
  { date: '04 mar', sessions: 15, msgs: 82, highlight: false },
]

export function SessionLogSection() {
  const maxSessions = Math.max(...sessions.map((s) => s.sessions))

  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 bottom-0 h-[300px] w-[300px] translate-x-1/4 translate-y-1/4 rounded-full bg-blue-500/6 blur-[100px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-blue-400 uppercase">
            LEADERBOARD
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2 font-mono text-blue-300">
            {m.talk_ld_session_title()}
          </h2>
          <p className="font-mono text-sm text-muted-foreground/60 mb-6">
            {m.talk_ld_session_subtitle()}
          </p>
        </AnimatedSection>

        <AnimatedSection>
          <div className="max-w-2xl">
            <div className="flex items-end gap-2 h-32 border-b border-blue-400/20 mb-3">
              {sessions.map((s) => {
                const heightPct = Math.round((s.sessions / maxSessions) * 100)
                return (
                  <div key={s.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t transition-all duration-700 ${
                        s.highlight
                          ? 'bg-gradient-to-t from-amber-500 to-amber-300'
                          : 'bg-blue-400/40'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              {sessions.map((s) => (
                <div key={s.date} className="flex-1 text-center">
                  <p
                    className={`font-mono text-[8px] leading-tight ${
                      s.highlight ? 'text-amber-400' : 'text-muted-foreground/40'
                    }`}
                  >
                    {s.date.split(' ')[0]}
                    <br />
                    {s.date.split(' ')[1]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-6">
          <div className="rounded-xl border border-amber-400/25 bg-amber-500/5 px-5 py-4 max-w-2xl">
            <p className="font-mono text-xs font-bold text-amber-300 mb-1">
              {m.talk_ld_session_peak()}
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-4">
          <p className="font-mono text-xs text-muted-foreground/60 italic max-w-xl">
            {m.talk_ld_session_pattern()}
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}
