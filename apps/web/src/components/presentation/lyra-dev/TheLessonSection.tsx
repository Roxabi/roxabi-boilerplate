import { AnimatedSection, Badge } from '@repo/ui'
import { m } from '@/paraglide/messages'

export function TheLessonSection() {
  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-[200px]" />
      </div>

      <div className="relative space-y-8">
        <AnimatedSection>
          <Badge className="border border-amber-400/60 bg-amber-500/15 text-amber-300 font-mono text-[9px] tracking-widest uppercase">
            {m.talk_ld_lesson_zone()}
          </Badge>
        </AnimatedSection>

        <AnimatedSection>
          <p className="font-mono text-[10px] tracking-[0.4em] text-amber-400/80 uppercase">
            {m.talk_ld_lesson_achievement()}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-amber-300 font-mono lg:text-4xl">
            {m.talk_ld_lesson_name()}
          </h2>
        </AnimatedSection>

        <AnimatedSection>
          <div
            className="mx-auto max-w-2xl rounded-2xl border border-amber-400/30 bg-amber-500/5 px-8 py-6"
            style={{ boxShadow: '0 0 60px rgba(245,158,11,0.08)' }}
          >
            <p className="text-xl font-semibold italic text-amber-200/90 leading-relaxed lg:text-2xl">
              &ldquo;{m.talk_ld_lesson_desc()}&rdquo;
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto text-left">
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-5 py-4">
              <p className="font-mono text-[9px] tracking-widest text-amber-400/50 uppercase mb-2">
                2ndBrain
              </p>
              <p className="font-mono text-sm text-muted-foreground/70">
                {m.talk_ld_lesson_part1()}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-5 py-4">
              <p className="font-mono text-[9px] tracking-widest text-emerald-400/50 uppercase mb-2">
                Lyra
              </p>
              <p className="font-mono text-sm text-emerald-200/70">{m.talk_ld_lesson_part2()}</p>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}
