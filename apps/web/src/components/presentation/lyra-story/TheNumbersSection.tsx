import { AnimatedSection, cn, StatCounter } from '@repo/ui'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'
import { useSlideReveal } from './useSlideReveal'

type Stat = {
  value: number
  label: string
  suffix?: string
  color: string
}

function TheNumbersSectionRpg() {
  const { ref, visible } = useSlideReveal({ threshold: 0.2 })

  const sessionStats = [
    { value: 52, label: m.talk_ls_rpg_numbers_time(), color: 'gold' as const },
    { value: 462, label: m.talk_ls_rpg_numbers_xp_earned(), color: 'emerald' as const },
    { value: 6, label: m.talk_ls_numbers_repos_label(), color: 'gold' as const },
    { value: 15, label: m.talk_ls_rpg_numbers_quests(), suffix: '+', color: 'emerald' as const },
    { value: 11, label: m.talk_ls_numbers_plugins_label(), color: 'gold' as const },
    { value: 1, label: m.talk_ls_rpg_numbers_gold(), color: 'emerald' as const },
  ]

  const colorStyle = {
    gold: { text: 'text-[#FFD700]', glow: 'bg-amber-500' },
    emerald: { text: 'text-[#50C878]', glow: 'bg-emerald-500' },
  }

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      <AnimatedSection className="text-center mb-12">
        <h2 className="rpg-pixel text-xl lg:text-2xl text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
          {m.talk_ls_rpg_numbers_zone()}
        </h2>
      </AnimatedSection>

      <div ref={ref} className="grid grid-cols-2 gap-8 sm:grid-cols-3 mb-12">
        {sessionStats.map((stat, index) => {
          const style = colorStyle[stat.color]
          return (
            <div
              key={stat.label}
              className={cn(
                'text-center transition-all duration-700',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: visible ? `${index * 120}ms` : '0ms' }}
            >
              <div className="relative">
                <div
                  className={cn(
                    'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 rounded-full blur-2xl opacity-20',
                    style.glow
                  )}
                />
                <div className={cn('relative', style.text)}>
                  <StatCounter value={stat.value} label={''} />
                  {stat.suffix && (
                    <span className={cn('absolute -right-3 top-0 text-2xl font-bold', style.text)}>
                      {stat.suffix}
                    </span>
                  )}
                </div>
              </div>
              <p className={cn('rpg-pixel text-[7px] uppercase tracking-wider mt-2', style.text)}>
                {stat.label}
              </p>
            </div>
          )
        })}
      </div>

      <AnimatedSection className="text-center">
        <div className="inline-block rounded-xl border border-[#FFD700]/40 bg-[#FFD700]/10 px-8 py-4">
          <p className="rpg-pixel text-sm text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
            {m.talk_ls_rpg_numbers_rating()}
          </p>
        </div>
      </AnimatedSection>
    </div>
  )
}

export function TheNumbersSection() {
  const { isRpg } = useLyraMode()
  const { ref, visible } = useSlideReveal({ threshold: 0.2 })
  if (isRpg) return <TheNumbersSectionRpg />

  const stats: Stat[] = [
    { value: 52, label: m.talk_ls_numbers_days_label(), color: 'blue' },
    { value: 462, label: m.talk_ls_numbers_commits_label(), color: 'purple' },
    { value: 6, label: m.talk_ls_numbers_repos_label(), color: 'blue' },
    { value: 15, label: m.talk_ls_numbers_skills_label(), suffix: '+', color: 'purple' },
    { value: 11, label: m.talk_ls_numbers_plugins_label(), color: 'blue' },
    { value: 1, label: m.talk_ls_numbers_identity_label(), color: 'purple' },
  ]

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      <div className="relative">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl">
            {m.talk_ls_numbers_title()}
          </h2>
        </AnimatedSection>

        <div ref={ref} className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                'text-center transition-all duration-700',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: visible ? `${index * 120}ms` : '0ms' }}
            >
              {/* Big number */}
              <div className="relative">
                {/* Glow behind number */}
                <div
                  className={cn(
                    'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 rounded-full blur-2xl opacity-30',
                    stat.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'
                  )}
                />
                <div className="relative">
                  <StatCounter value={stat.value} label={''} />
                  {stat.suffix && (
                    <span
                      className={cn(
                        'absolute -right-3 top-0 text-2xl font-bold',
                        stat.color === 'blue'
                          ? 'text-blue-600 dark:text-blue-300'
                          : 'text-purple-600 dark:text-purple-300'
                      )}
                    >
                      {stat.suffix}
                    </span>
                  )}
                </div>
              </div>
              <p
                className={cn(
                  'text-sm font-semibold uppercase tracking-wider mt-2',
                  stat.color === 'blue' ? 'text-blue-400' : 'text-purple-400'
                )}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
