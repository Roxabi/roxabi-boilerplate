import { AnimatedSection, Badge } from '@repo/ui'
import { m } from '@/paraglide/messages'

const skills = [
  { name: '/agenda-recap', level: 'Lv. 5', effect: 'View daily schedule in 3 seconds' },
  { name: '/email-summary', level: 'Lv. 6', effect: 'Stop drowning in Gmail' },
  { name: '/tasks-manager', level: 'Lv. 8', effect: 'Prioritize without thinking' },
]

export function SkillTreeSection() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-[300px] w-[300px] translate-x-1/4 -translate-y-1/4 rounded-full bg-emerald-500/8 blur-[100px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-emerald-400 uppercase">
            {m.talk_ld_skills_date()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-4 font-mono text-emerald-300">
            {m.talk_ld_skills_title()}
          </h2>
        </AnimatedSection>

        <AnimatedSection className="mt-4">
          <div className="overflow-hidden rounded-xl border border-emerald-400/25 bg-emerald-500/5 max-w-2xl">
            <div className="border-b border-emerald-400/20 px-4 py-2">
              <span className="font-mono text-[9px] tracking-widest text-emerald-400 uppercase">
                SKILL_TREE · UNLOCKED
              </span>
            </div>
            <div className="divide-y divide-emerald-400/10">
              {skills.map((skill) => (
                <div key={skill.name} className="flex items-center gap-4 px-4 py-3">
                  <span className="w-28 flex-shrink-0 rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-xs text-emerald-300 border border-emerald-400/25">
                    {skill.level}
                  </span>
                  <span className="font-mono text-sm text-emerald-100/90 font-semibold w-36">
                    {skill.name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground/70">{skill.effect}</span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-8">
          <div className="max-w-2xl">
            <p className="font-mono text-sm text-muted-foreground/70 mb-4">
              {m.talk_ld_skills_issue()}
            </p>
            <div className="flex items-start gap-3">
              <Badge className="mt-0.5 flex-shrink-0 border border-emerald-400/50 bg-emerald-500/10 text-emerald-300 font-mono text-[9px] tracking-widest uppercase">
                {m.talk_ld_skills_discovery_label()}
              </Badge>
              <p className="text-base font-semibold text-emerald-200/90 leading-snug">
                {m.talk_ld_skills_discovery()}
              </p>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-6">
          <p className="font-mono text-[10px] tracking-widest text-emerald-400/70 uppercase">
            {m.talk_ld_skills_xp()} &nbsp;·&nbsp; {m.talk_ld_skills_trait()}
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}
