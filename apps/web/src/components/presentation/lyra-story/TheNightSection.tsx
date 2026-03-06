import { AnimatedSection, Badge, cn } from '@repo/ui'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'
import { useSlideReveal } from './useSlideReveal'

type TimelineEntry = {
  time: string
  event: string
  isKey?: boolean
}

function TimelineRow({
  time,
  event,
  isKey = false,
  visible,
  delay,
}: TimelineEntry & { visible: boolean; delay: number }) {
  return (
    <div
      className={cn(
        'flex gap-6 transition-all duration-700',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Time stamp */}
      <div className="flex-shrink-0 w-16 text-right">
        <span
          className={cn(
            'font-mono text-sm tabular-nums',
            isKey ? 'text-blue-300 font-bold' : 'text-gray-400'
          )}
        >
          {time}
        </span>
      </div>

      {/* Line + dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'h-3 w-3 rounded-full border-2 flex-shrink-0',
            isKey
              ? 'border-blue-400 bg-blue-400/30 shadow-[0_0_12px_3px_rgba(96,165,250,0.4)] animate-pulse'
              : 'border-gray-600 bg-gray-800'
          )}
          style={isKey ? { animationDuration: '2.5s' } : undefined}
        />
        <div
          className={cn(
            'flex-1 w-px mt-1',
            isKey ? 'bg-gradient-to-b from-blue-400/30 to-gray-700/40' : 'bg-gray-700/40'
          )}
        />
      </div>

      {/* Event */}
      <div className="pb-6">
        <p
          className={cn(
            'text-sm leading-relaxed',
            isKey ? 'text-gray-100 font-medium' : 'text-gray-400'
          )}
        >
          {event}
        </p>
      </div>
    </div>
  )
}

/** Static probability dots — no JS animation, positioned with CSS */
function ProbabilityDots() {
  const dots = [
    { x: '8%', y: '15%', size: 'h-1 w-1', color: 'bg-blue-400/20' },
    { x: '92%', y: '25%', size: 'h-1.5 w-1.5', color: 'bg-purple-400/15' },
    { x: '5%', y: '60%', size: 'h-1 w-1', color: 'bg-blue-400/15' },
    { x: '95%', y: '70%', size: 'h-1 w-1', color: 'bg-purple-400/20' },
    { x: '20%', y: '85%', size: 'h-1 w-1', color: 'bg-blue-300/15' },
    { x: '80%', y: '10%', size: 'h-1 w-1', color: 'bg-purple-300/20' },
    { x: '50%', y: '5%', size: 'h-1.5 w-1.5', color: 'bg-blue-400/12' },
    { x: '35%', y: '90%', size: 'h-1 w-1', color: 'bg-purple-400/12' },
    { x: '65%', y: '80%', size: 'h-1 w-1', color: 'bg-blue-300/18' },
    { x: '12%', y: '40%', size: 'h-1 w-1', color: 'bg-purple-300/12' },
  ]
  return (
    <>
      {dots.map((dot) => (
        <div
          key={`${dot.x}-${dot.y}`}
          className={cn('absolute rounded-full', dot.size, dot.color)}
          style={{ left: dot.x, top: dot.y }}
          aria-hidden="true"
        />
      ))}
    </>
  )
}

function TheNightSectionRpg() {
  const { ref, visible } = useSlideReveal({ threshold: 0.15 })

  const phases = [
    { label: m.talk_ls_rpg_night_phase1(), damage: '-84 HP', number: '-89' },
    { label: m.talk_ls_rpg_night_phase2(), damage: '-92 HP', number: '-92' },
    { label: m.talk_ls_rpg_night_phase3(), damage: '-90 HP', number: '-90' },
  ]

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      <AnimatedSection>
        <h2 className="rpg-pixel text-xl lg:text-2xl text-[var(--rpg-crimson)] mb-8 text-center drop-shadow-[0_0_10px_rgba(220,20,60,0.5)] rpg-zone-enter">
          {m.talk_ls_rpg_night_zone()}
        </h2>
      </AnimatedSection>

      {/* Boss HP bar */}
      <AnimatedSection className="mb-10">
        <div className="rounded-xl border border-[var(--rpg-crimson)]/40 bg-gray-950/80 px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <span className="rpg-pixel text-[10px] text-[var(--rpg-crimson)]">
              {m.talk_ls_rpg_night_boss_name()}
            </span>
            <span className="rpg-pixel text-[9px] text-gray-400">
              {m.talk_ls_rpg_night_boss_hp()}
            </span>
          </div>
          <div className="h-4 w-full rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--rpg-crimson)] to-red-700 transition-all duration-[3000ms]"
              style={{ width: visible ? '0%' : '100%' }}
            />
          </div>
        </div>
      </AnimatedSection>

      {/* Attack phases */}
      <div ref={ref} className="space-y-4 mb-10">
        {phases.map((phase, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static ordered phase list
          <div
            key={index}
            className={cn(
              'flex items-center justify-between rounded-xl border border-[var(--rpg-crimson)]/25 bg-gray-950/60 px-6 py-4 transition-all duration-700',
              visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            )}
            style={{ transitionDelay: visible ? `${index * 150}ms` : '0ms' }}
          >
            <span className="text-gray-200 font-semibold">{phase.label}</span>
            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
              <span
                className="rpg-pixel text-[9px] text-[var(--rpg-crimson)] transition-opacity duration-500"
                style={{
                  opacity: visible ? 1 : 0,
                  transitionDelay: visible ? `${index * 150 + 400}ms` : '0ms',
                }}
              >
                {phase.number}
              </span>
              <span className="rpg-pixel text-[9px] text-[var(--rpg-crimson)]">{phase.damage}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Victory */}
      <AnimatedSection className="text-center space-y-3">
        <p className="rpg-pixel text-lg text-[var(--rpg-gold)] drop-shadow-[0_0_12px_rgba(255,215,0,0.6)] animate-pulse">
          {m.talk_ls_rpg_night_victory()}
        </p>
        <p className="rpg-pixel text-[10px] text-[var(--rpg-emerald)]">
          {m.talk_ls_rpg_night_loot()}
        </p>
      </AnimatedSection>
    </div>
  )
}

export function TheNightSection() {
  const { isRpg } = useLyraMode()
  const { ref, visible } = useSlideReveal({ threshold: 0.15 })
  if (isRpg) return <TheNightSectionRpg />

  const timeline: TimelineEntry[] = [
    { time: m.talk_ls_night_t1(), event: m.talk_ls_night_e1(), isKey: false },
    { time: m.talk_ls_night_t2(), event: m.talk_ls_night_e2(), isKey: false },
    { time: m.talk_ls_night_t3(), event: m.talk_ls_night_e3(), isKey: true },
    { time: m.talk_ls_night_t4(), event: m.talk_ls_night_e4(), isKey: false },
    { time: m.talk_ls_night_t7(), event: m.talk_ls_night_e7(), isKey: true },
    { time: m.talk_ls_night_t5(), event: m.talk_ls_night_e5(), isKey: true },
    { time: m.talk_ls_night_t8(), event: m.talk_ls_night_e8(), isKey: false },
    { time: m.talk_ls_night_t9(), event: m.talk_ls_night_e9(), isKey: true },
    { time: m.talk_ls_night_t6(), event: m.talk_ls_night_e6(), isKey: true },
  ]

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <ProbabilityDots />
        </div>
        <AnimatedSection>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
            <h2 className="text-4xl font-bold tracking-tight lg:text-5xl">
              {m.talk_ls_night_title()}
            </h2>
            <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30 self-start">
              {m.talk_ls_night_date()}
            </Badge>
          </div>
          <p className="text-gray-400 font-mono text-sm">{m.talk_ls_night_stats()}</p>
        </AnimatedSection>

        {/* Timeline */}
        <div ref={ref} className="mt-12">
          {timeline.map((entry, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static ordered timeline, never reordered
            <TimelineRow key={index} {...entry} visible={visible} delay={index * 120} />
          ))}
        </div>

        <AnimatedSection className="mt-4">
          <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-6 py-5">
            <p className="text-center italic text-gray-300 lg:text-lg">{m.talk_ls_night_peak()}</p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}
