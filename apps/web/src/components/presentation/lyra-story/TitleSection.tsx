import { AnimatedSection, Badge } from '@repo/ui'
import { m } from '@/paraglide/messages'
import { QuantumOrbital } from './QuantumOrbital'
import { useSlideReveal } from './useSlideReveal'

export function TitleSection() {
  const { ref, visible, reducedMotion } = useSlideReveal()

  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center text-center">
      {/* Quantum orbital hero background */}
      <div
        className="pointer-events-none absolute inset-[-20%] flex items-center justify-center"
        style={{
          mask: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          WebkitMask: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        }}
      >
        <div className="opacity-20 sm:opacity-25">
          <QuantumOrbital size={560} />
        </div>
      </div>

      {/* Outer atmospheric radial glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/8 blur-[180px] dark:bg-blue-500/14" />
        <div className="absolute left-1/3 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/6 blur-[140px] dark:bg-purple-500/10" />

        {/* Floating probability dots */}
        {visible && !reducedMotion && (
          <>
            <div
              className="absolute left-[15%] top-[20%] h-1 w-1 rounded-full bg-blue-400/60 dark:bg-blue-400/80 animate-pulse"
              style={{ animationDelay: '0s', animationDuration: '3s' }}
            />
            <div
              className="absolute right-[20%] top-[30%] h-1.5 w-1.5 rounded-full bg-purple-400/50 dark:bg-purple-400/70 animate-pulse"
              style={{ animationDelay: '1s', animationDuration: '4s' }}
            />
            <div
              className="absolute left-[25%] bottom-[25%] h-1 w-1 rounded-full bg-blue-300/40 dark:bg-blue-300/60 animate-pulse"
              style={{ animationDelay: '2s', animationDuration: '5s' }}
            />
            <div
              className="absolute right-[15%] bottom-[20%] h-1 w-1 rounded-full bg-purple-300/50 dark:bg-purple-300/70 animate-pulse"
              style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}
            />
            <div
              className="absolute left-[40%] top-[10%] h-1 w-1 rounded-full bg-blue-200/40 dark:bg-blue-200/50 animate-pulse"
              style={{ animationDelay: '1.5s', animationDuration: '4.5s' }}
            />
          </>
        )}
      </div>

      <div ref={ref} className="relative space-y-8">
        <AnimatedSection>
          <Badge
            variant="secondary"
            className="border border-blue-500/30 bg-blue-500/10 text-blue-400 dark:text-blue-300 tracking-widest uppercase text-[10px]"
          >
            {m.talk_ls_title_badge()}
          </Badge>
        </AnimatedSection>

        <AnimatedSection>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
            <span className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-600 dark:from-blue-300 dark:via-white dark:to-purple-300 bg-clip-text text-transparent">
              {m.talk_ls_title_title()}
            </span>
          </h1>
        </AnimatedSection>

        <AnimatedSection>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl lg:text-2xl uppercase tracking-[0.08em]">
            {m.talk_ls_title_subtitle()}
          </p>
        </AnimatedSection>

        {/* Decorative separator */}
        <AnimatedSection>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-blue-500/50" />
            <div className="h-2 w-2 rounded-full bg-blue-400/70" />
            <div className="h-px w-32 bg-blue-500/30" />
            <div className="h-2.5 w-2.5 rounded-full bg-purple-400/70" />
            <div className="h-px w-32 bg-purple-500/30" />
            <div className="h-2 w-2 rounded-full bg-blue-400/70" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-purple-500/50" />
          </div>
        </AnimatedSection>

        {/* Quantum formula — subtle signature */}
        <AnimatedSection>
          <p className="font-mono text-[10px] tracking-[0.3em] text-blue-400/25 dark:text-blue-400/30 select-none">
            |ψ⟩ = α|0⟩ + β|1⟩
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}
