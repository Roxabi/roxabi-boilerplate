import { AnimatedSection } from '@repo/ui'
import { m } from '@/paraglide/messages'

const repos = [
  {
    name: '2ndBrain',
    emoji: '🧠',
    role: '462 commits · Zones 1-50',
    color: 'emerald',
    date: '12 jan 2026',
  },
  {
    name: 'roxabi_boilerplate',
    emoji: '📦',
    role: 'SaaS boilerplate + AI',
    color: 'blue',
    date: '31 jan 2026',
  },
  {
    name: 'roxabi-plugins',
    emoji: '🔌',
    role: '11 plugins marketplace',
    color: 'purple',
    date: '28 fév 2026',
  },
  { name: 'voiceCLI', emoji: '🎙', role: 'TTS + STT CLI', color: 'amber', date: '28 fév 2026' },
  {
    name: 'roxabi-claude-config',
    emoji: '⚙️',
    role: 'tmux + aliases',
    color: 'gray',
    date: '28 fév 2026',
  },
  {
    name: 'Lyra',
    emoji: '⚡',
    role: 'hub asyncio multi-channel',
    color: 'emerald',
    date: '1 mar 2026',
  },
]

const colorClasses: Record<string, { border: string; text: string }> = {
  emerald: { border: 'border-emerald-400/30', text: 'text-emerald-400' },
  blue: { border: 'border-blue-400/30', text: 'text-blue-400' },
  purple: { border: 'border-purple-400/30', text: 'text-purple-400' },
  amber: { border: 'border-amber-400/30', text: 'text-amber-400' },
  gray: { border: 'border-gray-400/30', text: 'text-gray-400' },
}

export function GuildHallSection() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-[350px] w-[350px] translate-x-1/3 -translate-y-1/4 rounded-full bg-emerald-500/6 blur-[120px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-emerald-400 uppercase">
            GUILD_HALL
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2 font-mono text-emerald-300">
            {m.talk_ld_guild_title()}
          </h2>
          <p className="text-base text-muted-foreground/70 italic mb-6 max-w-2xl">
            {m.talk_ld_guild_intro()}
          </p>
        </AnimatedSection>

        <AnimatedSection>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl">
            {repos.map((repo) => {
              const cls = colorClasses[repo.color] ?? colorClasses.gray
              const border = cls?.border ?? 'border-gray-400/30'
              const text = cls?.text ?? 'text-gray-400'
              return (
                <div
                  key={repo.name}
                  className={`rounded-lg border bg-black/20 px-4 py-3 ${border}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base" aria-hidden="true">
                      {repo.emoji}
                    </span>
                    <p className={`font-mono text-xs font-bold ${text}`}>{repo.name}</p>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground/60">{repo.role}</p>
                  <p className="font-mono text-[9px] text-muted-foreground/40 mt-1">{repo.date}</p>
                </div>
              )
            })}
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}
