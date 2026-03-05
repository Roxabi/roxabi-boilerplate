import { AnimatedSection, Card, CardContent } from '@repo/ui'
import { CalendarDays, Server, Target } from 'lucide-react'
import { m } from '@/paraglide/messages'

export function SimpleIdeaSection() {
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
          <p className="text-2xl text-muted-foreground italic lg:text-3xl">
            "{m.talk_ls_simple_intent()}"
          </p>
        </AnimatedSection>

        <AnimatedSection className="mt-12">
          <Card
            variant="subtle"
            className="border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/5"
          >
            <CardContent className="pt-6 pb-6 space-y-6">
              {[
                {
                  icon: <Server className="h-5 w-5 text-blue-400" />,
                  label: m.talk_ls_simple_class_label(),
                  value: m.talk_ls_simple_class(),
                },
                {
                  icon: <CalendarDays className="h-5 w-5 text-purple-400" />,
                  label: m.talk_ls_simple_server_label(),
                  value: m.talk_ls_simple_server(),
                },
                {
                  icon: <Target className="h-5 w-5 text-blue-300" />,
                  label: m.talk_ls_simple_objective_label(),
                  value: m.talk_ls_simple_objective(),
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="flex-shrink-0 rounded-lg bg-background/50 p-2 border border-border/50">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 font-mono text-foreground">{item.value}</p>
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
