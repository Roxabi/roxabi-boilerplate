import { AnimatedSection, Badge } from '@repo/ui'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Github } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { QuantumOrbital } from './QuantumOrbital'

export function ClosingSection() {
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
