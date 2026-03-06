import { AnimatedSection } from '@repo/ui'
import { m } from '@/paraglide/messages'

const sources = [
  {
    name: 'Twitter / X',
    entries: 214,
    role: 'Intel on other guilds',
    bar: 55,
    color: 'bg-blue-400',
  },
  {
    name: 'GitHub repos',
    entries: 52,
    role: 'Analysis of rival builds',
    bar: 13,
    color: 'bg-emerald-400',
  },
  {
    name: 'YouTube',
    entries: 9,
    role: 'Advanced mechanics tutorials',
    bar: 2,
    color: 'bg-red-400',
  },
  { name: 'Reddit', entries: 4, role: 'Community feedback', bar: 1, color: 'bg-amber-400' },
]

const peakDays = [
  { date: 'Jan 24', entries: 47, label: '← discovery of the loot system' },
  { date: 'Jan 29', entries: 44, label: '← pre-industrialization grind' },
]

export function QuestJournalSection() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 bottom-0 h-[300px] w-[300px] -translate-x-1/4 translate-y-1/4 rounded-full bg-blue-500/6 blur-[100px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-blue-400 uppercase">
            LORE_ARCHIVE
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2 font-mono text-blue-300">
            {m.talk_ld_journal_title()}
          </h2>
          <p className="font-mono text-sm text-muted-foreground/60 mb-2">
            {m.talk_ld_journal_subtitle()}
          </p>
          <p className="font-mono text-sm text-blue-300/70 italic mb-6 max-w-2xl">
            {m.talk_ld_journal_mechanic()}
          </p>
        </AnimatedSection>

        <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
          <AnimatedSection>
            <div className="space-y-3">
              {sources.map((src) => (
                <div key={src.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-foreground/80">{src.name}</span>
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      {src.entries}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${src.color}`}
                      style={{ width: `${src.bar}%` }}
                    />
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground/50">{src.role}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <div className="space-y-3">
              <p className="font-mono text-[9px] tracking-widest text-blue-400/60 uppercase mb-3">
                PEAK COLLECTION DAYS
              </p>
              {peakDays.map((day) => (
                <div
                  key={day.date}
                  className="rounded-lg border border-blue-400/20 bg-blue-500/5 px-4 py-3 flex items-center gap-3"
                >
                  <div className="text-right">
                    <p className="font-mono text-xs text-blue-400">{day.date}</p>
                    <p className="font-mono text-xl font-bold text-blue-300">{day.entries}</p>
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground/60 flex-1 leading-snug">
                    {day.label}
                  </p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </div>
  )
}
