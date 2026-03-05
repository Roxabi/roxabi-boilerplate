import { AnimatedSection, cn } from '@repo/ui'
import { Star } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'
import { useSlideReveal } from './useSlideReveal'

type RepoNode = {
  id: string
  name: string
  desc: string
  x: number
  y: number
  isMain?: boolean
  isInfo?: boolean
}

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
  ['imagecli', 'lyra'],
  ['imagecli', 'voice'],
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
        r={repo.isMain ? 7 : repo.isInfo ? 2.5 : 4}
        className={cn(
          repo.isMain
            ? 'fill-teal-400/80 dark:fill-teal-300/90'
            : repo.isInfo
              ? 'fill-muted-foreground/25 dark:fill-muted-foreground/30'
              : 'fill-muted-foreground/50 dark:fill-muted-foreground/60'
        )}
      />
      {repo.isMain && (
        <>
          <circle
            cx={repo.x}
            cy={repo.y}
            r={11}
            fill="none"
            className="stroke-teal-400/30 dark:stroke-teal-300/40"
            strokeWidth="0.6"
          />
          <circle
            cx={repo.x}
            cy={repo.y}
            r={16}
            fill="none"
            className="stroke-teal-400/15 dark:stroke-teal-300/20"
            strokeWidth="0.4"
          />
        </>
      )}
      <text
        x={repo.x}
        y={repo.y - (repo.isMain ? 14 : repo.isInfo ? 5 : 8)}
        textAnchor="middle"
        className={cn(
          repo.isMain
            ? 'fill-foreground/90 dark:fill-foreground'
            : repo.isInfo
              ? 'fill-muted-foreground/40 dark:fill-muted-foreground/45'
              : 'fill-foreground/80 dark:fill-foreground/90'
        )}
        fontSize={repo.isMain ? 4 : repo.isInfo ? 2.5 : 3.5}
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
                  ? 'stroke-teal-400/40 dark:stroke-teal-400/50'
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
        .filter((r) => !r.isInfo)
        .map((repo, index) => (
          <div
            key={repo.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-700',
              visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6',
              repo.isMain
                ? 'border-teal-500/30 bg-gradient-to-r from-teal-500/10 to-emerald-500/10'
                : 'border-border/50 bg-background/30'
            )}
            style={{ transitionDelay: visible ? `${index * 80}ms` : '0ms' }}
          >
            <div
              className={cn(
                'flex-shrink-0 h-2 w-2 rounded-full',
                repo.isMain ? 'bg-teal-400' : 'bg-muted-foreground/40'
              )}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm font-mono font-semibold truncate',
                  repo.isMain ? 'text-teal-600 dark:text-teal-300' : 'text-foreground'
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

function TheEcosystemSectionRpg() {
  const { ref, visible } = useSlideReveal({ threshold: 0.15 })

  const members = [
    { name: m.talk_ls_ecosystem_repo2(), desc: m.talk_ls_ecosystem_repo2_desc() },
    { name: m.talk_ls_ecosystem_repo3(), desc: m.talk_ls_ecosystem_repo3_desc() },
    { name: m.talk_ls_ecosystem_repo4(), desc: m.talk_ls_ecosystem_repo4_desc() },
    { name: m.talk_ls_ecosystem_repo5(), desc: m.talk_ls_ecosystem_repo5_desc() },
    { name: m.talk_ls_ecosystem_repo7(), desc: m.talk_ls_ecosystem_repo7_desc() },
    { name: m.talk_ls_ecosystem_repo8(), desc: m.talk_ls_ecosystem_repo8_desc() },
  ]

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      <AnimatedSection className="text-center mb-10">
        <h2 className="rpg-pixel text-xl lg:text-2xl text-[var(--rpg-gold)] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)] mb-3">
          {m.talk_ls_rpg_ecosystem_roster()}
        </h2>
        <div className="inline-flex items-center gap-3">
          <span className="text-gray-400 rpg-pixel text-[9px]">
            {m.talk_ls_rpg_ecosystem_rank()}:
          </span>
          <span className="rpg-pixel text-[9px] text-[var(--rpg-emerald)]">
            {m.talk_ls_ecosystem_repo6()}
          </span>
          <span className="rounded-full border border-[var(--rpg-gold)]/40 bg-[var(--rpg-gold)]/10 px-2 py-0.5 rpg-pixel text-[7px] text-[var(--rpg-gold)]">
            {m.talk_ls_rpg_ecosystem_members()}
          </span>
        </div>
      </AnimatedSection>

      {/* Guild Master header */}
      <AnimatedSection className="mb-4">
        <div
          className="flex items-center gap-3 rounded-xl border-2 border-[var(--rpg-gold)]/60 bg-gradient-to-r from-[var(--rpg-gold)]/15 to-[var(--rpg-gold)]/5 px-5 py-3"
          style={{ boxShadow: '0 0 20px rgba(255,215,0,0.15)' }}
        >
          <Star className="h-5 w-5 text-[var(--rpg-gold)] flex-shrink-0 fill-[var(--rpg-gold)]/60" />
          <div className="min-w-0">
            <p className="rpg-pixel text-[8px] text-[var(--rpg-gold)]/60 uppercase tracking-widest mb-0.5">
              {m.talk_ls_rpg_ecosystem_guild_master()}
            </p>
            <p className="font-mono font-bold text-sm text-[var(--rpg-gold)] truncate">
              {m.talk_ls_ecosystem_repo6()}
            </p>
            <p className="text-xs text-gray-400">{m.talk_ls_ecosystem_repo6_desc()}</p>
          </div>
        </div>
      </AnimatedSection>

      {/* Members with golden vertical accent line */}
      <div ref={ref} className="relative pl-5">
        {/* Vertical gold line from guild master down */}
        <div className="absolute left-2 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--rpg-gold)]/60 via-[var(--rpg-gold)]/20 to-transparent" />

        <div className="space-y-2">
          {members.map((member, index) => (
            <div
              key={member.name}
              className={cn(
                'flex items-center gap-4 rounded-xl border border-[var(--rpg-gold)]/20 bg-gray-950/60 px-4 py-3 transition-all duration-700',
                visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
              )}
              style={{ transitionDelay: visible ? `${index * 100}ms` : '0ms' }}
            >
              <div
                className="flex-shrink-0 h-2 w-2 rounded-full bg-[var(--rpg-gold)]/60"
                style={{ boxShadow: '0 0 4px rgba(255,215,0,0.5)' }}
              />
              <div className="min-w-0 flex-1 border-b border-[var(--rpg-gold)]/10 pb-2 last:border-0 last:pb-0">
                <p className="font-mono font-semibold text-sm text-[var(--rpg-gold)]/90 truncate">
                  {member.name}
                </p>
                <p className="text-xs text-gray-400">{member.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TheEcosystemSection() {
  const { isRpg } = useLyraMode()
  const { ref, visible } = useSlideReveal({ threshold: 0.15 })
  if (isRpg) return <TheEcosystemSectionRpg />

  const repos: RepoNode[] = [
    {
      id: 'devkit',
      name: m.talk_ls_ecosystem_repo1(),
      desc: m.talk_ls_ecosystem_repo1_desc(),
      x: 18,
      y: 22,
      isInfo: true,
    },
    {
      id: '2ndbrain',
      name: m.talk_ls_ecosystem_repo2(),
      desc: m.talk_ls_ecosystem_repo2_desc(),
      x: 50,
      y: 18,
    },
    {
      id: 'boilerplate',
      name: m.talk_ls_ecosystem_repo3(),
      desc: m.talk_ls_ecosystem_repo3_desc(),
      x: 15,
      y: 55,
    },
    {
      id: 'plugins',
      name: m.talk_ls_ecosystem_repo4(),
      desc: m.talk_ls_ecosystem_repo4_desc(),
      x: 40,
      y: 78,
    },
    {
      id: 'voice',
      name: m.talk_ls_ecosystem_repo5(),
      desc: m.talk_ls_ecosystem_repo5_desc(),
      x: 72,
      y: 22,
    },
    {
      id: 'lyra',
      name: m.talk_ls_ecosystem_repo6(),
      desc: m.talk_ls_ecosystem_repo6_desc(),
      x: 50,
      y: 50,
      isMain: true,
    },
    {
      id: 'config',
      name: m.talk_ls_ecosystem_repo7(),
      desc: m.talk_ls_ecosystem_repo7_desc(),
      x: 82,
      y: 78,
      isInfo: true,
    },
    {
      id: 'imagecli',
      name: m.talk_ls_ecosystem_repo8(),
      desc: m.talk_ls_ecosystem_repo8_desc(),
      x: 82,
      y: 50,
    },
  ]

  return (
    <div className="relative mx-auto max-w-6xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/4 blur-[150px] dark:bg-teal-500/10" />
        <div className="absolute right-0 top-1/2 h-[300px] w-[300px] translate-x-1/4 -translate-y-1/4 rounded-full bg-emerald-500/5 blur-[80px] dark:bg-emerald-500/12" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2">
            {m.talk_ls_ecosystem_title()}
          </h2>
          <p className="text-lg text-muted-foreground">{m.talk_ls_ecosystem_subtitle()}</p>
        </AnimatedSection>

        <div ref={ref} className="mt-10 grid gap-8 md:grid-cols-2 md:items-center">
          {/* Mobile summary fallback — shown only on small screens */}
          <div className="md:hidden flex items-center justify-center gap-2 py-4">
            <div className="h-2.5 w-2.5 rounded-full bg-teal-400" />
            <p className="font-mono text-sm text-teal-600 dark:text-teal-300 font-semibold">
              {m.talk_ls_rpg_ecosystem_graph_summary({ repos: 8, connections: 14 })}
            </p>
          </div>
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
