import { AnimatedSection } from '@repo/ui'
import { m } from '@/paraglide/messages'

export function ClosingSection() {
  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/8 blur-[180px]" />
      </div>

      <div className="relative space-y-8">
        {/* Save point terminal */}
        <AnimatedSection>
          <div
            className="mx-auto max-w-xs overflow-hidden rounded-xl border border-emerald-400/30 bg-[#060d08]"
            style={{ boxShadow: '0 0 40px rgba(16,185,129,0.1)' }}
          >
            <div className="border-b border-emerald-400/20 bg-emerald-500/5 px-4 py-2.5 flex items-center justify-between">
              <span className="font-mono text-[9px] tracking-widest text-emerald-400 uppercase">
                SAVE POINT
              </span>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
            </div>
            <div className="px-5 py-5 space-y-2 text-left">
              <p className="font-mono text-[10px] text-emerald-400/60">
                {m.talk_ld_closing_slot()}
              </p>
              <p className="font-mono text-xs text-emerald-300/80">
                <span className="text-emerald-400">{'>'}</span> {m.talk_ld_closing_saving()}
              </p>
              <div className="h-1 w-full rounded-full bg-emerald-500/20 overflow-hidden">
                <div className="h-full w-full rounded-full bg-emerald-400/60 motion-safe:animate-pulse" />
              </div>
              <p className="font-mono text-xs text-emerald-300">{m.talk_ld_closing_complete()}</p>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <h2 className="text-5xl font-bold font-mono text-emerald-300 lg:text-6xl">
            {m.talk_ld_closing_title()}
          </h2>
        </AnimatedSection>

        <AnimatedSection>
          <div className="mx-auto max-w-md space-y-2">
            <p className="font-mono text-sm text-muted-foreground/60">
              {m.talk_ld_closing_links_label()}
            </p>
            <div className="flex items-center justify-center gap-6">
              <a href="https://github.com/MickaelV0" target="_blank" rel="noopener noreferrer">
                <span className="font-mono text-sm text-emerald-400">github.com/MickaelV0</span>
              </a>
              <span className="font-mono text-xs text-muted-foreground/40">·</span>
              <a href="https://roxabi.dev" target="_blank" rel="noopener noreferrer">
                <span className="font-mono text-sm text-emerald-400">roxabi.dev</span>
              </a>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <p className="motion-safe:animate-pulse font-mono text-[10px] tracking-[0.3em] text-emerald-400/50 uppercase select-none">
            {m.talk_ld_closing_continue()}
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}
