import { AnimatedSection, cn } from '@repo/ui'
import { m } from '@/paraglide/messages'
import { useSlideReveal } from './useSlideReveal'

type RepoNode = { id: string; name: string; desc: string; x: number; y: number; isMain?: boolean }

const connections: [string, string][] = [
  ['devkit', '2ndbrain'],
  ['2ndbrain', 'boilerplate'],
  ['2ndbrain', 'plugins'],
  ['2ndbrain', 'voice'],
  ['2ndbrain', 'lyra'],
  ['boilerplate', 'plugins'],
  ['boilerplate', 'lyra'],
  ['plugins', '2ndbrain'],
  ['plugins', 'lyra'],
  ['voice', '2ndbrain'],
  ['voice', 'lyra'],
  ['config', 'lyra'],
]

function GraphNode({ repo, visible, index }: { repo: RepoNode; visible: boolean; index: number }) {
  return (
    <g
      className={cn('transition-all duration-700', visible ? 'opacity-100' : 'opacity-0')}
      style={{ transitionDelay: visible ? `${index * 100}ms` : '0ms' }}
    >
      <circle
        cx={repo.x}
        cy={repo.y}
        r={repo.isMain ? 6 : 4}
        className={
          repo.isMain
            ? 'fill-blue-400/80 dark:fill-blue-300/90'
            : 'fill-muted-foreground/50 dark:fill-muted-foreground/60'
        }
      />
      {repo.isMain && (
        <circle
          cx={repo.x}
          cy={repo.y}
          r={9}
          fill="none"
          className="stroke-blue-400/30 dark:stroke-blue-300/40"
          strokeWidth="0.6"
        />
      )}
      <text
        x={repo.x}
        y={repo.y - (repo.isMain ? 10 : 6)}
        textAnchor="middle"
        className="fill-foreground/80 dark:fill-foreground/90"
        fontSize="3.5"
        fontWeight={repo.isMain ? 'bold' : 'normal'}
      >
        {repo.name}
      </text>
    </g>
  )
}

function EcosystemGraph({ repos, visible }: { repos: RepoNode[]; visible: boolean }) {
  const findNode = (id: string) => repos.find((r) => r.id === id)
  return (
    <div className="hidden md:block relative h-[500px]">
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        {connections.map(([from, to]) => {
          const fromNode = findNode(from)
          const toNode = findNode(to)
          if (!(fromNode && toNode)) return null
          const isToLyra = to === 'lyra'
          return (
            <line
              key={`${from}-${to}`}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              className={cn(
                'transition-all duration-1000',
                visible ? 'opacity-100' : 'opacity-0',
                isToLyra
                  ? 'stroke-blue-400/40 dark:stroke-blue-400/50'
                  : 'stroke-border/50 dark:stroke-border/40'
              )}
              strokeWidth={isToLyra ? '0.8' : '0.4'}
              style={{ transitionDelay: visible ? '300ms' : '0ms' }}
            />
          )
        })}
        {repos.map((repo, index) => (
          <GraphNode key={repo.id} repo={repo} visible={visible} index={index} />
        ))}
      </svg>
    </div>
  )
}

function RepoList({ repos, visible }: { repos: RepoNode[]; visible: boolean }) {
  return (
    <div className="space-y-3">
      {repos
        .filter((r) => r.id !== 'config')
        .map((repo, index) => (
          <div
            key={repo.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-700',
              visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6',
              repo.isMain
                ? 'border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-purple-500/10'
                : 'border-border/50 bg-background/30'
            )}
            style={{ transitionDelay: visible ? `${index * 80}ms` : '0ms' }}
          >
            <div
              className={cn(
                'flex-shrink-0 h-2 w-2 rounded-full',
                repo.isMain ? 'bg-blue-400' : 'bg-muted-foreground/40'
              )}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm font-mono font-semibold truncate',
                  repo.isMain ? 'text-blue-600 dark:text-blue-300' : 'text-foreground'
                )}
              >
                {repo.name}
              </p>
              <p className="text-xs text-muted-foreground">{repo.desc}</p>
            </div>
          </div>
        ))}
    </div>
  )
}

export function TheEcosystemSection() {
  const { ref, visible } = useSlideReveal({ threshold: 0.15 })

  const repos: RepoNode[] = [
    {
      id: 'devkit',
      name: m.talk_ls_ecosystem_repo1(),
      desc: m.talk_ls_ecosystem_repo1_desc(),
      x: 50,
      y: 20,
    },
    {
      id: '2ndbrain',
      name: m.talk_ls_ecosystem_repo2(),
      desc: m.talk_ls_ecosystem_repo2_desc(),
      x: 50,
      y: 45,
    },
    {
      id: 'boilerplate',
      name: m.talk_ls_ecosystem_repo3(),
      desc: m.talk_ls_ecosystem_repo3_desc(),
      x: 15,
      y: 70,
    },
    {
      id: 'plugins',
      name: m.talk_ls_ecosystem_repo4(),
      desc: m.talk_ls_ecosystem_repo4_desc(),
      x: 38,
      y: 80,
    },
    {
      id: 'voice',
      name: m.talk_ls_ecosystem_repo5(),
      desc: m.talk_ls_ecosystem_repo5_desc(),
      x: 62,
      y: 80,
    },
    {
      id: 'lyra',
      name: m.talk_ls_ecosystem_repo6(),
      desc: m.talk_ls_ecosystem_repo6_desc(),
      x: 82,
      y: 60,
      isMain: true,
    },
    {
      id: 'config',
      name: m.talk_ls_ecosystem_repo7(),
      desc: m.talk_ls_ecosystem_repo7_desc(),
      x: 80,
      y: 30,
    },
  ]

  return (
    <div className="relative mx-auto max-w-6xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/4 blur-[150px] dark:bg-blue-500/10" />
        <div className="absolute right-0 top-1/2 h-[300px] w-[300px] translate-x-1/4 -translate-y-1/4 rounded-full bg-purple-500/5 blur-[80px] dark:bg-purple-500/12" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2">
            {m.talk_ls_ecosystem_title()}
          </h2>
          <p className="text-lg text-muted-foreground">{m.talk_ls_ecosystem_subtitle()}</p>
        </AnimatedSection>

        <div ref={ref} className="mt-10 grid gap-8 md:grid-cols-2 md:items-center">
          <EcosystemGraph repos={repos} visible={visible} />
          <RepoList repos={repos} visible={visible} />
        </div>

        <AnimatedSection className="mt-8">
          <p className="text-center text-sm italic text-muted-foreground/70">
            {m.talk_ls_ecosystem_tagline()}
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}
