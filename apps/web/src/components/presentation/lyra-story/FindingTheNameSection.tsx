import { AnimatedSection, Card, CardContent, cn } from '@repo/ui'
import { Atom, X } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { QuantumOrbital } from './QuantumOrbital'
import { useSlideReveal } from './useSlideReveal'

export function FindingTheNameSection() {
  const { ref, visible } = useSlideReveal()

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      {/* Background glow — Lyra's palette */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-blue-500/6 blur-[130px] dark:bg-blue-500/18" />
        <div className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-purple-500/5 blur-[90px] dark:bg-purple-500/14" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-8">
            {m.talk_ls_name_title()}
          </h2>
        </AnimatedSection>

        {/* Name evolution */}
        <div ref={ref} className="grid gap-6 md:grid-cols-2">
          {/* Solene — crossed out */}
          <div
            className={cn(
              'transition-all duration-700',
              visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            )}
          >
            <Card
              variant="subtle"
              className="border border-border/50 bg-muted/30 relative overflow-hidden"
            >
              {/* Diagonal cross-out */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <X className="h-24 w-24 text-red-400/15 dark:text-red-400/20" />
              </div>
              <CardContent className="pt-6 pb-6 relative">
                <p className="text-4xl font-bold text-muted-foreground/40 line-through decoration-red-400/40 mb-3">
                  {m.talk_ls_name_solene_label()}
                </p>
                <p className="text-sm text-muted-foreground/60">{m.talk_ls_name_solene_desc()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Lyra — glowing with orbital background */}
          <div
            className={cn(
              'transition-all duration-700 relative',
              visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            )}
            style={{ transitionDelay: visible ? '200ms' : '0ms' }}
          >
            {/* Tiny orbital orbiting behind the LYRA card */}
            <div
              className="pointer-events-none absolute -right-6 -top-6 opacity-40"
              aria-hidden="true"
            >
              <QuantumOrbital size={120} />
            </div>

            <Card
              variant="subtle"
              className="border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-purple-500/10 relative overflow-hidden"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-purple-400/5" />
              <CardContent className="pt-6 pb-6 relative">
                <div className="flex items-center gap-3 mb-3">
                  <Atom className="h-5 w-5 text-blue-400" />
                  {/* LYRA — large name with orbital glow styling */}
                  <p
                    className="text-4xl font-bold tracking-[0.25em] uppercase"
                    style={{
                      background: 'linear-gradient(135deg, #60a5fa 0%, #ffffff 50%, #a78bfa 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter:
                        'drop-shadow(0 0 16px rgba(45,127,249,0.5)) drop-shadow(0 0 32px rgba(139,92,246,0.3))',
                    }}
                  >
                    {m.talk_ls_name_glow()}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">{m.talk_ls_name_lyra_desc()}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* The alias */}
        <AnimatedSection className="mt-8">
          <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {m.talk_ls_name_alias_label()}
            </p>
            <pre className="font-mono text-sm text-blue-600 dark:text-blue-300 bg-black/20 rounded-lg px-4 py-3 overflow-x-auto">
              <code>{m.talk_ls_name_alias_code()}</code>
            </pre>
            <p className="mt-3 text-sm text-muted-foreground/70 italic">
              {m.talk_ls_name_alias_note()}
            </p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}
