import { AnimatedSection, Card, CardContent } from '@repo/ui'
import { CalendarDays, Server, Target } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'

function SimpleIdeaSectionRpg() {
  const fields = [
    { label: m.talk_ls_rpg_simple_class_label(), value: m.talk_ls_rpg_simple_class() },
    { label: m.talk_ls_rpg_simple_race_label(), value: m.talk_ls_rpg_simple_race() },
    { label: m.talk_ls_rpg_simple_server_label(), value: m.talk_ls_rpg_simple_server() },
    { label: m.talk_ls_rpg_simple_objective_label(), value: m.talk_ls_rpg_simple_objective() },
  ]

  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 text-sm font-mono text-yellow-400 tracking-widest uppercase rpg-pixel text-[10px]">
            {m.talk_ls_rpg_simple_zone()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-4 rpg-pixel leading-tight text-yellow-300">
            {m.talk_ls_rpg_simple_title()}
          </h2>
        </AnimatedSection>

        <AnimatedSection className="mt-6">
          <Card
            variant="subtle"
            className="border border-yellow-400/40 bg-yellow-500/5 max-w-md mx-auto"
            style={{ boxShadow: '0 0 24px rgba(255,215,0,0.08)' }}
          >
            <CardContent className="pt-5 pb-5 space-y-4">
              {fields.map((field) => (
                <div key={field.label} className="flex items-start gap-3">
                  <div className="flex-shrink-0 rounded-md bg-yellow-500/10 p-1.5 border border-yellow-400/30">
                    <div className="h-4 w-4 rounded-sm bg-yellow-400/60" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400/80 rpg-pixel text-[9px]">
                      {field.label}
                    </p>
                    <p className="mt-0.5 font-mono text-sm text-yellow-100/90">{field.value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </AnimatedSection>

        <AnimatedSection className="mt-8">
          <p className="rpg-blink text-center text-sm text-yellow-300/70 font-mono max-w-lg mx-auto tracking-widest">
            {m.talk_ls_rpg_simple_confirm()}
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}

export function SimpleIdeaSection() {
  const { isRpg } = useLyraMode()

  if (isRpg) return <SimpleIdeaSectionRpg />
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-[300px] w-[300px] translate-x-1/4 -translate-y-1/4 rounded-full bg-blue-500/5 blur-[80px] dark:bg-blue-500/10" />
        <div className="absolute left-0 bottom-0 h-[250px] w-[250px] -translate-x-1/4 translate-y-1/4 rounded-full bg-purple-500/5 blur-[70px] dark:bg-purple-500/10" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 text-sm font-mono text-blue-400 dark:text-blue-300 tracking-widest uppercase">
            {m.talk_ls_simple_date()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-4">
            {m.talk_ls_simple_title()}
          </h2>
        </AnimatedSection>

        {/* Hero quote — the emotional anchor of this section */}
        <AnimatedSection className="mt-6 mb-10">
          <blockquote className="text-center">
            <p className="text-4xl font-bold italic tracking-tight text-foreground lg:text-5xl xl:text-6xl">
              &ldquo;{m.talk_ls_simple_intent()}&rdquo;
            </p>
          </blockquote>
        </AnimatedSection>

        {/* Character creation card — smaller, secondary */}
        <AnimatedSection className="mt-6">
          <Card
            variant="subtle"
            className="border border-border/40 bg-muted/20 dark:bg-muted/10 max-w-md mx-auto"
          >
            <CardContent className="pt-5 pb-5 space-y-4">
              {[
                {
                  icon: <Server className="h-4 w-4 text-blue-400" />,
                  label: m.talk_ls_simple_class_label(),
                  value: m.talk_ls_simple_class(),
                },
                {
                  icon: <CalendarDays className="h-4 w-4 text-purple-400" />,
                  label: m.talk_ls_simple_server_label(),
                  value: m.talk_ls_simple_server(),
                },
                {
                  icon: <Target className="h-4 w-4 text-blue-300" />,
                  label: m.talk_ls_simple_objective_label(),
                  value: m.talk_ls_simple_objective(),
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="flex-shrink-0 rounded-md bg-background/50 p-1.5 border border-border/40">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {item.label}
                    </p>
                    <p className="mt-0.5 font-mono text-sm text-foreground/80">{item.value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </AnimatedSection>

        <AnimatedSection className="mt-8">
          <p className="text-center text-sm text-muted-foreground/60 italic max-w-lg mx-auto">
            {m.talk_ls_simple_note()}
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}
