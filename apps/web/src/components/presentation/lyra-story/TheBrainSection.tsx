import { AnimatedSection, Badge, Card, CardContent, cn } from '@repo/ui'
import { Brain, Github, Twitter, Youtube } from 'lucide-react'
import type { ReactNode } from 'react'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'
import { useSlideReveal } from './useSlideReveal'

type StatItem = { icon: ReactNode; value: string; label: string; color: string }

function ConstellationDot({
  cx,
  cy,
  r = 3,
  delay = 0,
  visible,
}: {
  cx: number
  cy: number
  r?: number
  delay?: number
  visible: boolean
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      className={cn(
        'fill-blue-400/60 dark:fill-blue-300/70 transition-all duration-700',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      style={{ transitionDelay: `${delay}ms` }}
    />
  )
}

function BrainConstellation({ visible }: { visible: boolean }) {
  return (
    <div className="hidden lg:flex items-center justify-center">
      <svg
        width="300"
        height="300"
        viewBox="0 0 300 300"
        className="opacity-70 dark:opacity-90"
        aria-hidden="true"
      >
        {visible && (
          <g className="transition-opacity duration-1000" style={{ transitionDelay: '400ms' }}>
            <line
              x1="150"
              y1="150"
              x2="80"
              y2="80"
              className="stroke-blue-400/30"
              strokeWidth="1"
            />
            <line
              x1="150"
              y1="150"
              x2="220"
              y2="90"
              className="stroke-blue-400/30"
              strokeWidth="1"
            />
            <line
              x1="150"
              y1="150"
              x2="70"
              y2="200"
              className="stroke-purple-400/25"
              strokeWidth="1"
            />
            <line
              x1="150"
              y1="150"
              x2="230"
              y2="210"
              className="stroke-blue-400/25"
              strokeWidth="1"
            />
            <line
              x1="150"
              y1="150"
              x2="150"
              y2="60"
              className="stroke-blue-400/20"
              strokeWidth="1"
            />
            <line
              x1="80"
              y1="80"
              x2="220"
              y2="90"
              className="stroke-blue-400/15"
              strokeWidth="0.5"
            />
            <line
              x1="70"
              y1="200"
              x2="230"
              y2="210"
              className="stroke-purple-400/15"
              strokeWidth="0.5"
            />
            <line
              x1="80"
              y1="80"
              x2="70"
              y2="200"
              className="stroke-blue-400/10"
              strokeWidth="0.5"
            />
            <line
              x1="220"
              y1="90"
              x2="230"
              y2="210"
              className="stroke-blue-400/10"
              strokeWidth="0.5"
            />
          </g>
        )}
        <ConstellationDot cx={150} cy={150} r={8} delay={0} visible={visible} />
        <ConstellationDot cx={80} cy={80} r={5} delay={100} visible={visible} />
        <ConstellationDot cx={220} cy={90} r={5} delay={200} visible={visible} />
        <ConstellationDot cx={70} cy={200} r={4} delay={300} visible={visible} />
        <ConstellationDot cx={230} cy={210} r={4} delay={400} visible={visible} />
        <ConstellationDot cx={150} cy={60} r={3} delay={150} visible={visible} />
        <ConstellationDot cx={40} cy={140} r={2.5} delay={250} visible={visible} />
        <ConstellationDot cx={260} cy={150} r={2.5} delay={350} visible={visible} />
        <ConstellationDot cx={160} cy={240} r={3} delay={450} visible={visible} />
        <ConstellationDot cx={110} cy={50} r={1.5} delay={500} visible={visible} />
        <ConstellationDot cx={200} cy={45} r={1.5} delay={550} visible={visible} />
        <ConstellationDot cx={50} cy={110} r={1.5} delay={600} visible={visible} />
        <ConstellationDot cx={250} cy={120} r={1.5} delay={650} visible={visible} />
        <ConstellationDot cx={45} cy={250} r={1.5} delay={700} visible={visible} />
        <ConstellationDot cx={240} cy={260} r={1.5} delay={750} visible={visible} />
      </svg>
    </div>
  )
}

function StatCard({ stat, visible, delay }: { stat: StatItem; visible: boolean; delay: number }) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all duration-700',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        stat.color === 'blue'
          ? 'border-blue-500/20 bg-blue-500/5'
          : stat.color === 'sky'
            ? 'border-sky-500/20 bg-sky-500/5'
            : stat.color === 'purple'
              ? 'border-purple-500/20 bg-purple-500/5'
              : 'border-red-500/20 bg-red-500/5'
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      <div className="flex items-center gap-2 mb-2">{stat.icon}</div>
      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
      <p className="text-xs text-muted-foreground">{stat.label}</p>
    </div>
  )
}

function TheBrainSectionRpg() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 text-sm font-mono text-yellow-400 tracking-widest uppercase rpg-pixel text-[10px]">
            {m.talk_ls_rpg_brain_zone()}
          </div>
        </AnimatedSection>

        {/* Legendary item drop card */}
        <AnimatedSection className="mt-6">
          <div className="relative max-w-md mx-auto">
            {/* Sparkle dots around the card */}
            <div
              className="pointer-events-none absolute -top-3 -left-3 h-2 w-2 rounded-full bg-yellow-400 animate-pulse"
              style={{ animationDelay: '0ms', boxShadow: '0 0 6px rgba(255,215,0,0.8)' }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -top-2 -right-4 h-1.5 w-1.5 rounded-full bg-yellow-300 animate-pulse"
              style={{ animationDelay: '600ms', boxShadow: '0 0 5px rgba(255,215,0,0.7)' }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-3 -right-2 h-2.5 w-2.5 rounded-full bg-yellow-400 animate-pulse"
              style={{ animationDelay: '300ms', boxShadow: '0 0 8px rgba(255,215,0,0.9)' }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-2 -left-4 h-1.5 w-1.5 rounded-full bg-yellow-300 animate-pulse"
              style={{ animationDelay: '900ms', boxShadow: '0 0 5px rgba(255,215,0,0.7)' }}
              aria-hidden="true"
            />
            <Card
              variant="subtle"
              className="border-2 border-yellow-400/60 bg-yellow-500/5"
              style={{
                boxShadow: '0 0 40px rgba(255,215,0,0.25), 0 0 80px rgba(255,215,0,0.1)',
                animation: 'rpg-float 3s ease-in-out infinite',
              }}
            >
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                {/* Legendary badge */}
                <Badge className="border border-yellow-400/60 bg-yellow-500/20 text-yellow-300 rpg-pixel text-[9px] tracking-widest">
                  {m.talk_ls_rpg_brain_rarity()}
                </Badge>

                {/* Item icon */}
                <div
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border-2 border-yellow-400/50 bg-yellow-500/10"
                  style={{ boxShadow: '0 0 20px rgba(255,215,0,0.3)' }}
                >
                  <Brain className="h-8 w-8 text-yellow-400" />
                </div>

                {/* Item name */}
                <h2
                  className="text-2xl font-bold rpg-pixel text-yellow-300 leading-tight"
                  style={{
                    textShadow: '0 0 12px rgba(255,215,0,0.6), 0 0 24px rgba(255,215,0,0.3)',
                  }}
                >
                  {m.talk_ls_rpg_brain_item()}
                </h2>

                {/* Stats */}
                <p className="font-mono text-sm text-yellow-200/70">
                  {m.talk_ls_rpg_brain_stats()}
                </p>

                {/* Divider */}
                <div className="h-px bg-yellow-400/20" />

                {/* Flavor text */}
                <p className="text-sm italic text-yellow-100/50">{m.talk_ls_rpg_brain_flavor()}</p>
              </CardContent>
            </Card>
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}

export function TheBrainSection() {
  const { isRpg } = useLyraMode()
  const { ref, visible } = useSlideReveal({ threshold: 0.2 })

  if (isRpg) return <TheBrainSectionRpg />

  const stats: StatItem[] = [
    {
      icon: <Brain className="h-5 w-5 text-blue-400" />,
      value: m.talk_ls_brain_stat1_value(),
      label: m.talk_ls_brain_stat1_label(),
      color: 'blue',
    },
    {
      icon: <Twitter className="h-5 w-5 text-sky-400" />,
      value: m.talk_ls_brain_stat2_value(),
      label: m.talk_ls_brain_stat2_label(),
      color: 'sky',
    },
    {
      icon: <Github className="h-5 w-5 text-purple-400" />,
      value: m.talk_ls_brain_stat3_value(),
      label: m.talk_ls_brain_stat3_label(),
      color: 'purple',
    },
    {
      icon: <Youtube className="h-5 w-5 text-red-400" />,
      value: m.talk_ls_brain_stat4_value(),
      label: m.talk_ls_brain_stat4_label(),
      color: 'red',
    },
  ]

  return (
    <div className="relative mx-auto max-w-6xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/6 blur-[120px] dark:bg-blue-500/15" />
        <div className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-purple-500/5 blur-[80px] dark:bg-purple-500/12" />
      </div>

      <div className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <AnimatedSection>
            <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2">
              {m.talk_ls_brain_title()}
            </h2>
            <p className="text-lg text-muted-foreground">{m.talk_ls_brain_subtitle()}</p>
          </AnimatedSection>

          <AnimatedSection className="mt-8">
            <Card variant="subtle" className="border border-blue-500/20 bg-blue-500/5">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <Brain className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-300 text-sm">
                      {m.talk_ls_brain_knowledge_label()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {m.talk_ls_brain_knowledge_desc()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          <div ref={ref} className="mt-8 grid grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <StatCard key={stat.label} stat={stat} visible={visible} delay={index * 100} />
            ))}
          </div>
        </div>

        <BrainConstellation visible={visible} />
      </div>
    </div>
  )
}
