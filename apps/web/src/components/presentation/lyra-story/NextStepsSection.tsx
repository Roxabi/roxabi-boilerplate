import { AnimatedSection, Card, CardContent, cn } from '@repo/ui'
import { Bot, Users } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { useSlideReveal } from './useSlideReveal'

const orbs = [
  { id: 'orbit-18', cx: 50, cy: 50, r: 18, delay: '0ms', speed: 8 },
  { id: 'orbit-28', cx: 50, cy: 50, r: 28, delay: '500ms', speed: 12 },
  { id: 'orbit-38', cx: 50, cy: 50, r: 38, delay: '1000ms', speed: 16 },
]

const companions = [
  { id: 'comp-0', angle: 0, distance: 18, size: 4, color: 'fill-blue-400/80' },
  { id: 'comp-72', angle: 72, distance: 28, size: 3, color: 'fill-cyan-400/70' },
  { id: 'comp-144', angle: 144, distance: 22, size: 3.5, color: 'fill-blue-300/75' },
  { id: 'comp-216', angle: 216, distance: 28, size: 3, color: 'fill-indigo-400/70' },
  { id: 'comp-288', angle: 288, distance: 18, size: 4, color: 'fill-sky-400/80' },
]

const guildNodes = [
  { id: 'n0', x: 50, y: 20, main: true },
  { id: 'n1', x: 20, y: 45, main: false },
  { id: 'n2', x: 80, y: 45, main: false },
  { id: 'n3', x: 35, y: 75, main: false },
  { id: 'n4', x: 65, y: 75, main: false },
  { id: 'n5', x: 10, y: 75, main: false },
  { id: 'n6', x: 90, y: 75, main: false },
]

const guildEdges = [
  { id: 'e01', a: 0, b: 1 },
  { id: 'e02', a: 0, b: 2 },
  { id: 'e13', a: 1, b: 3 },
  { id: 'e24', a: 2, b: 4 },
  { id: 'e15', a: 1, b: 5 },
  { id: 'e26', a: 2, b: 6 },
  { id: 'e34', a: 3, b: 4 },
  { id: 'e14', a: 1, b: 4 },
  { id: 'e35', a: 3, b: 5 },
]

function CompanionOrbs() {
  return (
    <div className="relative mx-auto h-24 w-24" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        {orbs.map((orb) => (
          <circle
            key={orb.id}
            cx={orb.cx}
            cy={orb.cy}
            r={orb.r}
            fill="none"
            className="stroke-blue-400/30 dark:stroke-blue-300/25"
            strokeWidth="0.5"
            strokeDasharray="2 3"
            style={{
              animation: `spin ${orb.speed}s linear infinite`,
              transformOrigin: '50px 50px',
              animationDelay: orb.delay,
            }}
          />
        ))}
        {/* Central core */}
        <circle cx={50} cy={50} r={5} className="fill-blue-500/70 dark:fill-blue-400/80" />
        <circle
          cx={50}
          cy={50}
          r={7}
          fill="none"
          className="stroke-blue-400/50 dark:stroke-blue-300/60"
          strokeWidth="0.5"
        />
        {/* Companion dots */}
        {companions.map((c) => {
          const rad = (c.angle * Math.PI) / 180
          const x = 50 + c.distance * Math.cos(rad)
          const y = 50 + c.distance * Math.sin(rad)
          return (
            <g key={c.id}>
              <circle cx={x} cy={y} r={c.size} className={c.color} />
              <circle
                cx={x}
                cy={y}
                r={c.size + 1.5}
                fill="none"
                className="stroke-blue-300/20 dark:stroke-blue-200/15"
                strokeWidth="0.3"
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function GuildNetwork() {
  return (
    <div className="relative mx-auto h-24 w-24" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        {guildEdges.map((edge) => {
          const nodeA = guildNodes[edge.a]
          const nodeB = guildNodes[edge.b]
          if (!(nodeA && nodeB)) return null
          return (
            <line
              key={edge.id}
              x1={nodeA.x}
              y1={nodeA.y}
              x2={nodeB.x}
              y2={nodeB.y}
              className="stroke-purple-400/35 dark:stroke-purple-300/30"
              strokeWidth="0.5"
            />
          )
        })}
        {guildNodes.map((node) => (
          <g key={node.id}>
            {node.main && (
              <circle
                cx={node.x}
                cy={node.y}
                r={8}
                fill="none"
                className="stroke-purple-400/25 dark:stroke-purple-300/20"
                strokeWidth="0.5"
              />
            )}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.main ? 5 : 3}
              className={
                node.main
                  ? 'fill-purple-500/80 dark:fill-purple-400/90'
                  : 'fill-purple-400/55 dark:fill-purple-300/65'
              }
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

export function NextStepsSection() {
  const { ref, visible } = useSlideReveal({ threshold: 0.2 })

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[140px] dark:bg-blue-500/12" />
        <div className="absolute right-1/4 top-1/2 h-[400px] w-[400px] translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/5 blur-[120px] dark:bg-purple-500/10" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2">
            {m.talk_ls_next_title()}
          </h2>
          <p className="text-lg text-muted-foreground">{m.talk_ls_next_subtitle()}</p>
        </AnimatedSection>

        <div ref={ref} className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Card 1: Gets Pets! */}
          <Card
            className={cn(
              'group relative overflow-hidden border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-background to-cyan-500/5 transition-all duration-700',
              'hover:border-blue-500/40 hover:shadow-[0_0_40px_-8px_rgba(59,130,246,0.25)] hover:-translate-y-1',
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            )}
            style={{ transitionDelay: visible ? '100ms' : '0ms' }}
          >
            {/* Subtle corner glow */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/8 blur-2xl dark:bg-blue-400/12" />
            <CardContent className="p-8">
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 rounded-xl border border-blue-500/25 bg-blue-500/10 p-3 dark:border-blue-400/20 dark:bg-blue-400/10">
                  <Bot className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {m.talk_ls_next_pets_title()}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {m.talk_ls_next_pets_desc()}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <CompanionOrbs />
              </div>

              {/* Blue accent line */}
              <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
            </CardContent>
          </Card>

          {/* Card 2: Create a Guild */}
          <Card
            className={cn(
              'group relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-violet-500/5 transition-all duration-700',
              'hover:border-purple-500/40 hover:shadow-[0_0_40px_-8px_rgba(168,85,247,0.25)] hover:-translate-y-1',
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            )}
            style={{ transitionDelay: visible ? '220ms' : '0ms' }}
          >
            {/* Subtle corner glow */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-500/8 blur-2xl dark:bg-purple-400/12" />
            <CardContent className="p-8">
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 rounded-xl border border-purple-500/25 bg-purple-500/10 p-3 dark:border-purple-400/20 dark:bg-purple-400/10">
                  <Users className="h-6 w-6 text-purple-500 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {m.talk_ls_next_guild_title()}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {m.talk_ls_next_guild_desc()}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <GuildNetwork />
              </div>

              {/* Purple accent line */}
              <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
