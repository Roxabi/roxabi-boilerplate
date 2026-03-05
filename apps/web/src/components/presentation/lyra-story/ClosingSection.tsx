import { AnimatedSection, Badge } from '@repo/ui'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Bot, Github, Users } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'
import { QuantumOrbital } from './QuantumOrbital'
import { useSlideReveal } from './useSlideReveal'

function ClosingSectionRpg() {
  const { ref, visible } = useSlideReveal()
  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center justify-center text-center">
      <div className="relative space-y-10 w-full">
        <AnimatedSection>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground/50">
            Roxabi
          </p>
        </AnimatedSection>

        {/* Save slot UI */}
        <AnimatedSection>
          <div
            ref={ref}
            className="rounded-2xl border-2 border-[var(--rpg-gold)]/50 bg-gray-950/90 mx-auto max-w-sm px-8 py-8 shadow-[0_0_40px_rgba(255,215,0,0.15)]"
          >
            <p className="rpg-pixel text-[10px] text-gray-400 mb-6 tracking-wider">
              {m.talk_ls_rpg_closing_slot()}
            </p>

            {/* Progress bar */}
            <div className="mb-5">
              <div className="h-3 w-full rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--rpg-gold)] to-amber-500 transition-all duration-[2000ms]"
                  style={{ width: visible ? '100%' : '0%' }}
                />
              </div>
            </div>

            {/* Save text sequence */}
            <div className="space-y-2 mb-6">
              <p
                className="rpg-pixel text-[9px] text-gray-400 transition-opacity duration-500"
                style={{ opacity: visible ? 1 : 0 }}
              >
                {m.talk_ls_rpg_closing_saving()}
              </p>
              <p
                className="rpg-pixel text-[10px] text-[var(--rpg-emerald)] drop-shadow-[0_0_8px_rgba(80,200,120,0.4)] transition-opacity duration-700 rpg-achievement"
                style={{ opacity: visible ? 1 : 0, transitionDelay: visible ? '2200ms' : '0ms' }}
              >
                {m.talk_ls_rpg_closing_complete()}
              </p>
            </div>

            <p className="rpg-pixel text-[9px] text-[var(--rpg-gold)]/70 rpg-blink">
              {m.talk_ls_rpg_closing_continue()}
            </p>
          </div>
        </AnimatedSection>

        {/* Back link */}
        <AnimatedSection>
          <Link
            to="/talks"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            {m.talk_ls_closing_back()}
          </Link>
        </AnimatedSection>

        <AnimatedSection>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/60">
            <Github className="h-4 w-4" />
            <span>{m.talk_ls_closing_built_with()}</span>
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <div className="flex items-center justify-center">
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-[var(--rpg-gold)]/30 to-transparent" />
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}

export function ClosingSection() {
  const { isRpg } = useLyraMode()
  if (isRpg) return <ClosingSectionRpg />

  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center justify-center text-center">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[130px] dark:bg-blue-500/12" />
        <div className="absolute right-1/3 bottom-1/3 h-[250px] w-[250px] rounded-full bg-purple-500/4 blur-[80px] dark:bg-purple-500/10" />
      </div>

      <div className="relative space-y-10">
        {/* Roxabi logo wordmark */}
        <AnimatedSection>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground/50">
            Roxabi
          </p>
        </AnimatedSection>

        <AnimatedSection>
          <h2 className="text-5xl font-bold tracking-tight lg:text-6xl">
            {m.talk_ls_closing_title()}
          </h2>
          <p className="mt-4 text-xl text-muted-foreground">{m.talk_ls_closing_subtitle()}</p>
        </AnimatedSection>

        {/* Ecosystem tagline */}
        <AnimatedSection>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30 text-sm px-4 py-1.5">
              {m.talk_ls_closing_ecosystem()}
            </Badge>
            <Badge variant="secondary" className="text-sm px-4 py-1.5">
              {m.talk_ls_closing_products()}
            </Badge>
          </div>
        </AnimatedSection>

        {/* Quantum orbital — Lyra's goodbye signature */}
        <AnimatedSection>
          <div className="flex justify-center">
            <div className="opacity-60">
              <QuantumOrbital size={100} />
            </div>
          </div>
          <p className="mt-3 font-mono text-[9px] tracking-[0.4em] text-blue-400/30 uppercase select-none">
            |ψ⟩ = α|0⟩ + β|1⟩
          </p>
        </AnimatedSection>

        {/* What's next — compact cards folded into closing */}
        <AnimatedSection>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-left max-w-xs">
              <div className="flex-shrink-0 rounded-lg border border-blue-500/20 bg-blue-500/10 p-2">
                <Bot className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {m.talk_ls_next_pets_title()}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {m.talk_ls_next_pets_desc()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3 text-left max-w-xs">
              <div className="flex-shrink-0 rounded-lg border border-purple-500/20 bg-purple-500/10 p-2">
                <Users className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {m.talk_ls_next_guild_title()}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {m.talk_ls_next_guild_desc()}
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Built with */}
        <AnimatedSection>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/60">
            <Github className="h-4 w-4" />
            <span>{m.talk_ls_closing_built_with()}</span>
          </div>
        </AnimatedSection>

        {/* Back link */}
        <AnimatedSection>
          <Link
            to="/talks"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            {m.talk_ls_closing_back()}
          </Link>
        </AnimatedSection>

        {/* Decorative element */}
        <AnimatedSection>
          <div className="flex items-center justify-center">
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}
