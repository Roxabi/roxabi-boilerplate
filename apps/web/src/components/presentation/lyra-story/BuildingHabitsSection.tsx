import {
  AnimatedSection,
  Badge,
  Card,
  CardContent,
  cn,
  useInView,
  useReducedMotion,
} from '@repo/ui'
import { GitMerge, Terminal } from 'lucide-react'
import { m } from '@/paraglide/messages'

type SkillItem = { name: string; desc: string; color: string }

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
        'transition-all duration-700',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      <Card
        variant="subtle"
        className={cn(
          'h-full text-center border',
          skill.color === 'blue'
            ? 'border-blue-500/20 bg-blue-500/5'
            : 'border-purple-500/20 bg-purple-500/5'
        )}
      >
        <CardContent className="pt-6 space-y-3">
          <div
            className={cn(
              'flex items-center justify-center gap-2 mx-auto w-10 h-10 rounded-lg',
              skill.color === 'blue' ? 'bg-blue-500/10' : 'bg-purple-500/10'
            )}
          >
            <Terminal
              className={cn(
                'h-5 w-5',
                skill.color === 'blue' ? 'text-blue-400' : 'text-purple-400'
              )}
            />
          </div>
          <p
            className={cn(
              'font-mono text-sm font-bold',
              skill.color === 'blue'
                ? 'text-blue-600 dark:text-blue-300'
                : 'text-purple-600 dark:text-purple-300'
            )}
          >
            {skill.name}
          </p>
          <p className="text-sm text-muted-foreground">{skill.desc}</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function BuildingHabitsSection() {
  const reducedMotion = useReducedMotion()
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true })
  const visible = inView || reducedMotion

  const skillData: SkillItem[] = [
    { name: m.talk_ls_habits_skill1_name(), desc: m.talk_ls_habits_skill1_desc(), color: 'blue' },
    { name: m.talk_ls_habits_skill2_name(), desc: m.talk_ls_habits_skill2_desc(), color: 'purple' },
    { name: m.talk_ls_habits_skill3_name(), desc: m.talk_ls_habits_skill3_desc(), color: 'blue' },
  ]

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-1/4 top-1/4 h-[350px] w-[350px] rounded-full bg-blue-500/5 blur-[100px] dark:bg-blue-500/10" />
        <div className="absolute left-0 bottom-1/4 h-[250px] w-[250px] -translate-x-1/4 rounded-full bg-purple-500/5 blur-[80px] dark:bg-purple-500/10" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <h2 className="mb-2 text-4xl font-bold tracking-tight lg:text-5xl">
            {m.talk_ls_habits_title()}
          </h2>
          <p className="text-lg text-muted-foreground">{m.talk_ls_habits_subtitle()}</p>
        </AnimatedSection>

        <div ref={ref} className="mt-12 grid gap-4 sm:grid-cols-3">
          {skillData.map((skill, index) => (
            <SkillNode key={skill.name} skill={skill} visible={visible} delay={index * 150} />
          ))}
        </div>

        <AnimatedSection className="mt-8">
          <Card
            variant="subtle"
            className="border border-purple-500/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5"
          >
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="flex-shrink-0 rounded-lg bg-purple-500/10 p-2">
                <GitMerge className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="font-mono text-sm font-bold text-purple-300">
                  {m.talk_ls_habits_shared_label()}
                </p>
                <p className="mt-1 text-muted-foreground text-sm">
                  {m.talk_ls_habits_shared_desc()}
                </p>
              </div>
            </CardContent>
          </Card>
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
