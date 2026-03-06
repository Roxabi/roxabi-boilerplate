import { AnimatedSection, Badge } from '@repo/ui'
import { m } from '@/paraglide/messages'

export function TitleSection() {
  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center text-center">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[180px]" />
        <div className="absolute left-1/3 top-1/3 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/8 blur-[120px]" />
      </div>

      {/* Pixel particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute h-px w-px bg-emerald-400 motion-safe:animate-pulse"
            style={{
              left: `${10 + i * 20}%`,
              top: `${15 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${2.5 + i * 0.4}s`,
            }}
          />
        ))}
      </div>

      <div className="relative space-y-8 py-4">
        <AnimatedSection>
          <Badge className="border border-emerald-400/50 bg-emerald-500/15 text-emerald-300 tracking-widest uppercase text-[10px] font-mono">
            {m.talk_ld_title_badge()}
          </Badge>
        </AnimatedSection>

        <AnimatedSection>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl font-mono leading-tight">
            <span className="bg-gradient-to-br from-emerald-300 via-emerald-400 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]">
              {m.talk_ld_title_title()}
            </span>
          </h1>
        </AnimatedSection>

        <AnimatedSection>
          <p className="mx-auto max-w-2xl text-base text-emerald-100/60 sm:text-lg uppercase tracking-[0.1em] font-mono">
            {m.talk_ld_title_subtitle()}
          </p>
        </AnimatedSection>

        <AnimatedSection>
          <blockquote className="mx-auto max-w-2xl border-l-2 border-emerald-500/40 pl-4 text-left">
            <p className="text-sm italic text-muted-foreground/70 leading-relaxed">
              {m.talk_ld_title_epigraph()}
            </p>
          </blockquote>
        </AnimatedSection>

        <AnimatedSection>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-emerald-500/40" />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
            <div className="h-px w-24 bg-emerald-500/25" />
            <div className="h-2 w-2 rounded-full bg-amber-400/60" />
            <div className="h-px w-24 bg-emerald-500/25" />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-emerald-500/40" />
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <p className="motion-safe:animate-pulse font-mono text-[11px] tracking-[0.3em] text-emerald-400/60 select-none">
            {m.talk_ld_title_prompt()}
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}
