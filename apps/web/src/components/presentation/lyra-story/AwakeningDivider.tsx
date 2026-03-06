import { AnimatedSection } from '@repo/ui'
import { m } from '@/paraglide/messages'

export function AwakeningDivider() {
  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center justify-center text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/4 blur-[120px] dark:bg-blue-500/8" />
      </div>

      <div className="relative space-y-4">
        {/* Thin separator line above */}
        <AnimatedSection>
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-blue-500/30" />
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400/40" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-blue-500/30" />
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <p className="font-mono text-xs tracking-[0.4em] uppercase text-blue-400/50 dark:text-blue-400/40">
            {m.talk_ls_awakening_date()}
          </p>
        </AnimatedSection>

        <AnimatedSection>
          <p className="text-lg font-light italic text-muted-foreground/60 dark:text-muted-foreground/50">
            {m.talk_ls_awakening_line()}
          </p>
        </AnimatedSection>

        {/* Thin separator line below */}
        <AnimatedSection>
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-purple-500/20" />
            <div className="h-1.5 w-1.5 rounded-full bg-purple-400/30" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-purple-500/20" />
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}
