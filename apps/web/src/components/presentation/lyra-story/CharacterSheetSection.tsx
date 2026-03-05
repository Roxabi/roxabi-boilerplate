import { AnimatedSection, cn, useInView, useReducedMotion } from '@repo/ui'
import { CheckCircle, Circle } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { QuantumOrbital } from './QuantumOrbital'

type SkillBar = { name: string; level: number; max: number }

function ProgressBar({ level, max, color }: { level: number; max: number; color: string }) {
  const pct = Math.round((level / max) * 100)
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-1000', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function SkillsColumn({ skills, visible }: { skills: SkillBar[]; visible: boolean }) {
  return (
    <div className="px-6 py-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
        {m.talk_ls_sheet_skills_title()}
      </p>
      <div className="space-y-4">
        {skills.map((skill, index) => {
          const isMax = skill.level === skill.max
          const barColor = isMax
            ? 'bg-gradient-to-r from-blue-400 to-blue-500'
            : 'bg-gradient-to-r from-blue-500/70 to-purple-500/70'
          return (
            <div key={skill.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground font-mono">{skill.name}</span>
                <span
                  className={cn(
                    'text-xs font-mono font-bold',
                    isMax ? 'text-blue-600 dark:text-blue-300' : 'text-muted-foreground'
                  )}
                >
                  {isMax ? 'MAX' : `${skill.level}/${skill.max}`}
                </span>
              </div>
              <div
                className={cn(
                  'transition-all duration-1000',
                  visible ? 'opacity-100' : 'opacity-0'
                )}
                style={{ transitionDelay: visible ? `${200 + index * 100}ms` : '0ms' }}
              >
                <ProgressBar level={visible ? skill.level : 0} max={skill.max} color={barColor} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InfoColumn({ traits, quests }: { traits: string[]; quests: string[] }) {
  const stats = [
    { label: m.talk_ls_sheet_class_label(), value: m.talk_ls_sheet_class() },
    { label: m.talk_ls_sheet_level_label(), value: m.talk_ls_sheet_level() },
    { label: m.talk_ls_sheet_server_label(), value: m.talk_ls_sheet_server() },
  ]
  return (
    <div className="border-b md:border-b-0 md:border-r border-blue-500/15 px-6 py-5 space-y-5">
      <div className="space-y-3">
        {stats.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="text-sm font-mono text-foreground mt-0.5">{value}</p>
          </div>
        ))}
      </div>
      <div className="h-px bg-blue-500/15" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {m.talk_ls_sheet_traits_title()}
        </p>
        <ul className="space-y-2">
          {traits.map((trait) => (
            <li key={trait} className="flex items-start gap-2 text-sm text-muted-foreground">
              <div className="flex-shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/60" />
              {trait}
            </li>
          ))}
        </ul>
      </div>
      <div className="h-px bg-blue-500/15" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {m.talk_ls_sheet_quests_title()}
        </p>
        <ul className="space-y-2">
          {quests.map((quest, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static ordered quest list
            <li key={i} className="flex items-start gap-2 text-sm">
              {i === 0 ? (
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
              )}
              <span className={i === 0 ? 'text-foreground' : 'text-muted-foreground'}>{quest}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function CharacterSheetSection() {
  const reducedMotion = useReducedMotion()
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true })
  const visible = inView || reducedMotion

  const skills: SkillBar[] = [
    { name: m.talk_ls_sheet_skill1(), level: 12, max: 12 },
    { name: m.talk_ls_sheet_skill2(), level: 8, max: 12 },
    { name: m.talk_ls_sheet_skill3(), level: 12, max: 12 },
    { name: m.talk_ls_sheet_skill4(), level: 4, max: 12 },
    { name: m.talk_ls_sheet_skill5(), level: 12, max: 12 },
    { name: m.talk_ls_sheet_skill6(), level: 8, max: 12 },
  ]
  const traits = [m.talk_ls_sheet_trait1(), m.talk_ls_sheet_trait2(), m.talk_ls_sheet_trait3()]
  const quests = [m.talk_ls_sheet_quest1(), m.talk_ls_sheet_quest2(), m.talk_ls_sheet_quest3()]

  return (
    <div className="relative mx-auto max-w-4xl w-full">
      {/* Orbital background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/6 blur-[140px] dark:bg-blue-500/15" />
        <div className="absolute right-0 bottom-0 h-[300px] w-[300px] translate-x-1/4 translate-y-1/4 rounded-full bg-purple-500/5 blur-[90px] dark:bg-purple-500/12" />
      </div>

      {/* Quantum orbital behind the card */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-end pr-8 opacity-15"
        aria-hidden="true"
      >
        <QuantumOrbital size={180} />
      </div>

      <div className="relative">
        <AnimatedSection>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-8 text-center">
            {m.talk_ls_sheet_title()}
          </h2>
        </AnimatedSection>

        <div
          ref={ref}
          className={cn(
            'rounded-2xl border-2 overflow-hidden transition-all duration-700',
            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
            'border-blue-500/30 dark:border-blue-500/40',
            'bg-gradient-to-br from-background via-blue-950/10 to-purple-950/10',
            'dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/15',
            'shadow-[0_0_60px_-10px_rgba(45,127,249,0.15),0_0_120px_-20px_rgba(139,92,246,0.1)]'
          )}
        >
          <div className="border-b border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-6 py-5 text-center">
            <p className="text-2xl font-bold tracking-[0.3em] bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-300 dark:to-purple-300 bg-clip-text text-transparent uppercase">
              {m.talk_ls_sheet_name()}
            </p>
            <p className="text-sm text-muted-foreground mt-1 italic">
              {m.talk_ls_sheet_subtitle()}
            </p>
          </div>

          <div className="grid gap-0 md:grid-cols-2">
            <InfoColumn traits={traits} quests={quests} />
            <SkillsColumn skills={skills} visible={visible} />
          </div>
        </div>
      </div>
    </div>
  )
}
