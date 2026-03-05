import { AnimatedSection, Badge, cn } from '@repo/ui'
import { m } from '@/paraglide/messages'
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
            isKey ? 'text-blue-300 font-bold' : 'text-gray-500'
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

export function TheNightSection() {
  const { ref, visible } = useSlideReveal({ threshold: 0.15 })

  const timeline: TimelineEntry[] = [
    { time: m.talk_ls_night_t1(), event: m.talk_ls_night_e1(), isKey: false },
    { time: m.talk_ls_night_t2(), event: m.talk_ls_night_e2(), isKey: false },
    { time: m.talk_ls_night_t3(), event: m.talk_ls_night_e3(), isKey: true },
    { time: m.talk_ls_night_t4(), event: m.talk_ls_night_e4(), isKey: false },
    { time: m.talk_ls_night_t5(), event: m.talk_ls_night_e5(), isKey: true },
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
