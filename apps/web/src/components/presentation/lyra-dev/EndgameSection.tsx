import { AnimatedSection } from '@repo/ui'
import { m } from '@/paraglide/messages'

const days = () => [
  { label: 'J+1', text: m.talk_ld_endgame_j1() },
  { label: 'J+2', text: m.talk_ld_endgame_j2() },
  { label: 'J+3', text: m.talk_ld_endgame_j3() },
  { label: 'J+4', text: m.talk_ld_endgame_j4() },
]

const memoryLevels = [
  { level: 0, name: 'Travail', analogy: 'HP actuels — reset each combat', color: 'text-red-400' },
  { level: 1, name: 'Session', analogy: 'Active buffs — last 30 minutes', color: 'text-amber-400' },
  {
    level: 2,
    name: 'Épisodique',
    analogy: 'Quest journal — dated notes',
    color: 'text-yellow-400',
  },
  {
    level: 3,
    name: 'Sémantique',
    analogy: 'Kingdom database — BM25 + embeddings',
    color: 'text-emerald-400',
  },
  {
    level: 4,
    name: 'Procédurale',
    analogy: 'Muscle memory — what works, automated',
    color: 'text-blue-400',
  },
]

export function EndgameSection() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-emerald-500/8 blur-[160px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-emerald-400 uppercase">
            {m.talk_ld_endgame_date()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2 font-mono text-emerald-300">
            {m.talk_ld_endgame_title()}
          </h2>
          <p className="text-sm text-muted-foreground/70 italic mb-6 max-w-2xl">
            {m.talk_ld_endgame_insight()}
          </p>
        </AnimatedSection>

        <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
          <AnimatedSection>
            <div className="space-y-2">
              <p className="font-mono text-[9px] tracking-widest text-emerald-400/60 uppercase mb-3">
                BUILD TIMELINE
              </p>
              {days().map(({ label, text }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-4 py-3"
                >
                  <span className="flex-shrink-0 font-mono text-xs font-bold text-emerald-400 w-8">
                    {label}
                  </span>
                  <p className="font-mono text-xs text-emerald-200/70 leading-snug">{text}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <div className="space-y-2">
              <p className="font-mono text-[9px] tracking-widest text-amber-400/60 uppercase mb-3">
                {m.talk_ld_endgame_memory_title()}
              </p>
              {memoryLevels.map(({ level, name, analogy, color }) => (
                <div
                  key={level}
                  className="flex items-center gap-3 rounded border border-white/5 bg-white/5 px-3 py-2"
                >
                  <span className={`flex-shrink-0 font-mono text-xs font-bold w-4 ${color}`}>
                    {level}
                  </span>
                  <div>
                    <p className={`font-mono text-xs font-semibold ${color}`}>{name}</p>
                    <p className="font-mono text-[9px] text-muted-foreground/50">{analogy}</p>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </div>
  )
}
