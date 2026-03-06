import { AnimatedSection, Card, CardContent } from '@repo/ui'
import { m } from '@/paraglide/messages'

const fields = () => [
  { label: m.talk_ld_char_class_label(), value: m.talk_ld_char_class() },
  { label: m.talk_ld_char_race_label(), value: m.talk_ld_char_race() },
  { label: m.talk_ld_char_server_label(), value: m.talk_ld_char_server() },
  { label: m.talk_ld_char_objective_label(), value: m.talk_ld_char_objective() },
]

export function CharacterCreationSection() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-[350px] w-[350px] translate-x-1/4 -translate-y-1/4 rounded-full bg-amber-500/8 blur-[100px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-amber-400 uppercase">
            {m.talk_ld_char_date()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-6 font-mono text-amber-300">
            {m.talk_ld_char_title()}
          </h2>
        </AnimatedSection>

        <AnimatedSection className="mt-4">
          <Card
            variant="subtle"
            className="border border-amber-400/30 bg-amber-500/5 max-w-lg mx-auto"
            style={{ boxShadow: '0 0 40px rgba(245,158,11,0.08)' }}
          >
            <CardContent className="pt-6 pb-6 space-y-5">
              {fields().map((field) => (
                <div key={field.label} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 rounded bg-amber-500/15 border border-amber-400/30 px-1.5 py-0.5">
                    <span className="font-mono text-[8px] tracking-widest text-amber-400 uppercase">
                      {field.label}
                    </span>
                  </div>
                  <p className="font-mono text-sm text-amber-100/80 leading-snug">{field.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </AnimatedSection>

        <AnimatedSection className="mt-8">
          <p className="text-center font-mono text-xs text-amber-400/50 italic max-w-md mx-auto leading-relaxed">
            {m.talk_ld_char_warning()}
          </p>
        </AnimatedSection>

        <AnimatedSection className="mt-6">
          <p className="motion-safe:animate-pulse text-center font-mono text-[10px] tracking-[0.3em] text-amber-400/70 uppercase">
            [ PRESS START ]
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}
