import { AnimatedSection, Badge, Card, CardContent, cn } from '@repo/ui'
import {
  GitBranch,
  GitMerge,
  ListTodo,
  type LucideIcon,
  Mail,
  Repeat,
  Terminal,
} from 'lucide-react'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'
import { useSlideReveal } from './useSlideReveal'

type SkillItem = { name: string; desc: string; color: string; icon: LucideIcon }

function SkillNode({
  skill,
  visible,
  delay,
}: {
  skill: SkillItem
  visible: boolean
  delay: number
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 transition-all duration-700',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {/* Icon tower — top */}
      <div
        className={cn(
          'flex h-16 w-16 items-center justify-center rounded-2xl border-2',
          skill.color === 'blue'
            ? 'border-blue-500/30 bg-blue-500/10'
            : 'border-purple-500/30 bg-purple-500/10'
        )}
      >
        <skill.icon
          className={cn('h-7 w-7', skill.color === 'blue' ? 'text-blue-400' : 'text-purple-400')}
        />
      </div>
      {/* Vertical connector */}
      <div
        className={cn(
          'h-8 w-px',
          skill.color === 'blue'
            ? 'bg-gradient-to-b from-blue-500/40 to-blue-500/10'
            : 'bg-gradient-to-b from-purple-500/40 to-purple-500/10'
        )}
      />
      {/* Name — middle */}
      <p
        className={cn(
          'font-mono text-sm font-bold text-center',
          skill.color === 'blue'
            ? 'text-blue-600 dark:text-blue-300'
            : 'text-purple-600 dark:text-purple-300'
        )}
      >
        {skill.name}
      </p>
      {/* Vertical connector */}
      <div
        className={cn(
          'h-8 w-px',
          skill.color === 'blue'
            ? 'bg-gradient-to-b from-blue-500/10 to-transparent'
            : 'bg-gradient-to-b from-purple-500/10 to-transparent'
        )}
      />
      {/* Description — bottom */}
      <p className="text-sm text-muted-foreground text-center">{skill.desc}</p>
    </div>
  )
}

const NODE_ICONS = [Terminal, Mail, ListTodo] as const

function BuildingHabitsSectionRpg() {
  const nodes = [
    { label: m.talk_ls_rpg_habits_node1(), name: m.talk_ls_habits_skill1_name() },
    { label: m.talk_ls_rpg_habits_node2(), name: m.talk_ls_habits_skill2_name() },
    { label: m.talk_ls_rpg_habits_node3(), name: m.talk_ls_habits_skill3_name() },
  ]

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 text-sm font-mono text-emerald-400 tracking-widest uppercase rpg-pixel text-[10px]">
            {m.talk_ls_rpg_habits_zone()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2 rpg-pixel leading-tight text-emerald-300">
            {m.talk_ls_rpg_habits_title()}
          </h2>
        </AnimatedSection>

        {/* Skill tree: 3 nodes in a row */}
        <AnimatedSection className="mt-12">
          <div className="flex items-center justify-center gap-0">
            {nodes.map((node, index) => {
              const NodeIcon = NODE_ICONS[index]
              return (
                <div key={node.name} className="flex items-center">
                  {/* Node */}
                  <div
                    className="flex flex-col items-center gap-3"
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-400/60 bg-emerald-500/15 animate-pulse"
                      style={{
                        boxShadow: '0 0 16px rgba(80,200,120,0.3)',
                        animationDuration: `${2 + index * 0.5}s`,
                        animationDelay: `${index * 300}ms`,
                      }}
                    >
                      {NodeIcon && <NodeIcon className="h-6 w-6 text-emerald-300" />}
                    </div>
                    <p className="font-mono text-xs font-bold text-emerald-200 text-center max-w-[100px]">
                      {node.name}
                    </p>
                    <Badge className="border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 text-[9px] rpg-pixel">
                      {node.label}
                    </Badge>
                  </div>
                  {/* Connector dots */}
                  {index < nodes.length - 1 && (
                    <div className="flex items-center gap-1 px-3 mb-10">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-1 w-1 rounded-full bg-emerald-400/60"
                          style={{ boxShadow: '0 0 3px rgba(80,200,120,0.5)' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </AnimatedSection>

        {/* Passive skill highlight */}
        <AnimatedSection className="mt-8">
          <Card
            variant="subtle"
            className="border border-emerald-500/30 bg-emerald-500/5"
            style={{ boxShadow: '0 0 20px rgba(80,200,120,0.1)' }}
          >
            <CardContent className="pt-6 pb-6 flex items-start gap-4">
              <div className="flex-shrink-0 rounded-lg bg-emerald-500/10 p-2">
                <GitMerge className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="rpg-pixel text-[10px] text-emerald-300 uppercase tracking-widest">
                  {m.talk_ls_rpg_habits_passive()}
                </p>
                <p className="mt-1 text-muted-foreground text-sm">
                  {m.talk_ls_rpg_habits_shared()}
                </p>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        <AnimatedSection className="mt-6">
          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 rpg-pixel text-[9px]">
            {m.talk_ls_rpg_habits_xp()}
          </Badge>
        </AnimatedSection>
      </div>
    </div>
  )
}

export function BuildingHabitsSection() {
  const { isRpg } = useLyraMode()
  const { ref, visible } = useSlideReveal()

  if (isRpg) return <BuildingHabitsSectionRpg />

  const skillData: SkillItem[] = [
    {
      name: m.talk_ls_habits_skill1_name(),
      desc: m.talk_ls_habits_skill1_desc(),
      color: 'blue',
      icon: Terminal,
    },
    {
      name: m.talk_ls_habits_skill2_name(),
      desc: m.talk_ls_habits_skill2_desc(),
      color: 'purple',
      icon: GitBranch,
    },
    {
      name: m.talk_ls_habits_skill3_name(),
      desc: m.talk_ls_habits_skill3_desc(),
      color: 'blue',
      icon: Repeat,
    },
  ]

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      <div className="relative">
        <AnimatedSection>
          <h2 className="mb-2 text-4xl font-bold tracking-tight lg:text-5xl">
            {m.talk_ls_habits_title()}
          </h2>
          <p className="text-lg text-muted-foreground">{m.talk_ls_habits_subtitle()}</p>
        </AnimatedSection>

        <div ref={ref} className="mt-12 grid gap-8 sm:grid-cols-3">
          {skillData.map((skill, index) => (
            <SkillNode key={skill.name} skill={skill} visible={visible} delay={index * 150} />
          ))}
        </div>

        <AnimatedSection className="mt-10">
          {/* Full-width highlighted strip for shared discovery */}
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-blue-500/8 via-purple-500/12 to-blue-500/8 px-8 py-5">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"
              aria-hidden="true"
            />
            <div className="relative flex items-center gap-5">
              <div className="flex-shrink-0 rounded-xl bg-purple-500/15 p-3 border border-purple-500/25">
                <GitMerge className="h-6 w-6 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-bold text-purple-600 dark:text-purple-300">
                  {m.talk_ls_habits_shared_label()}
                </p>
                <p className="mt-0.5 text-muted-foreground text-sm">
                  {m.talk_ls_habits_shared_desc()}
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-6 flex flex-wrap gap-3">
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30">
            {m.talk_ls_habits_xp()}
          </Badge>
          <Badge variant="secondary" className="text-muted-foreground">
            {m.talk_ls_habits_trait()}
          </Badge>
        </AnimatedSection>
      </div>
    </div>
  )
}
