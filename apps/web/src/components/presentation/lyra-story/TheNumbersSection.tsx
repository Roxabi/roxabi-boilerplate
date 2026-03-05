import { AnimatedSection, cn, StatCounter, useInView, useReducedMotion } from '@repo/ui'
import { m } from '@/paraglide/messages'

type Stat = {
  value: number
  label: string
  suffix?: string
  color: string
}

export function TheNumbersSection() {
  const reducedMotion = useReducedMotion()
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true })
  const visible = inView || reducedMotion

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
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[140px] dark:bg-blue-500/12" />
        <div className="absolute right-0 top-0 h-[250px] w-[250px] translate-x-1/4 -translate-y-1/4 rounded-full bg-purple-500/5 blur-[80px] dark:bg-purple-500/10" />
      </div>

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
