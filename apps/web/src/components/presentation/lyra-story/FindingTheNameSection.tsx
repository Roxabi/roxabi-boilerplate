import { AnimatedSection, Card, CardContent, cn } from '@repo/ui'
import { Atom, X } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'
import { QuantumOrbital } from './QuantumOrbital'
import { useSlideReveal } from './useSlideReveal'

function SoleneCard({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        'transition-all duration-700',
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
      )}
      style={{ transform: visible ? 'rotate(-2deg)' : 'translateX(-2rem) rotate(-2deg)' }}
    >
      <Card
        variant="subtle"
        className="border border-border/30 bg-muted/20 relative overflow-hidden grayscale opacity-60"
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <X className="h-24 w-24 text-red-400/20 dark:text-red-400/25" />
        </div>
        <CardContent className="pt-6 pb-6 relative">
          <p className="text-4xl font-bold text-muted-foreground/50 line-through decoration-red-400/50 mb-3">
            {m.talk_ls_name_solene_label()}
          </p>
          <p className="text-sm text-muted-foreground/50">{m.talk_ls_name_solene_desc()}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function TransformArrow({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        'hidden md:flex items-center justify-center flex-shrink-0 transition-all duration-700',
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
      )}
      style={{ transitionDelay: visible ? '150ms' : '0ms' }}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-1">
        <div className="h-px w-8 bg-gradient-to-r from-border/40 to-blue-400/60" />
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="text-blue-400/70"
          aria-hidden="true"
        >
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}

function LyraCard({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        'transition-all duration-700 relative',
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      )}
      style={{ transitionDelay: visible ? '200ms' : '0ms' }}
    >
      <div
        className="absolute -inset-[1px] rounded-[calc(var(--radius)+1px)] animate-pulse"
        style={{
          background:
            'linear-gradient(135deg, rgba(96,165,250,0.5), rgba(167,139,250,0.5), rgba(96,165,250,0.5))',
          animationDuration: '3s',
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute -right-6 -top-6 opacity-50" aria-hidden="true">
        <QuantumOrbital size={160} />
      </div>
      <Card
        variant="subtle"
        className="border-0 bg-gradient-to-br from-blue-500/12 to-purple-500/12 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/6 to-purple-400/6" />
        <CardContent className="pt-6 pb-6 relative">
          <div className="flex items-center gap-3 mb-3">
            <Atom className="h-5 w-5 text-blue-400" />
            <p
              className="text-4xl font-bold tracking-[0.25em] uppercase"
              style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #c4b5fd 50%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter:
                  'drop-shadow(0 0 20px rgba(45,127,249,0.4)) drop-shadow(0 0 40px rgba(139,92,246,0.3))',
              }}
            >
              {m.talk_ls_name_glow()}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{m.talk_ls_name_lyra_desc()}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function AliasBlock() {
  return (
    <AnimatedSection className="mt-8">
      <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {m.talk_ls_name_alias_label()}
        </p>
        <div className="rounded-lg bg-gray-900 dark:bg-black/70 overflow-hidden border border-gray-800 dark:border-white/5">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-700 dark:border-white/5 bg-gray-800/50 dark:bg-white/3">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
            <span className="ml-2 text-[10px] text-gray-500 dark:text-white/20 font-mono tracking-widest">
              ~/.aliases
            </span>
          </div>
          <pre className="font-mono text-sm text-blue-400 dark:text-blue-300 px-4 py-3 overflow-x-auto">
            <code>
              <span className="text-gray-500 dark:text-white/30 select-none">$ </span>
              {m.talk_ls_name_alias_code()}
              <span
                className="inline-block w-[2px] h-[1em] bg-blue-400/70 dark:bg-blue-300/70 ml-0.5 align-middle animate-pulse"
                style={{ animationDuration: '1.1s' }}
                aria-hidden="true"
              />
            </code>
          </pre>
        </div>
        <p className="mt-3 text-sm text-muted-foreground/70 italic">
          {m.talk_ls_name_alias_note()}
        </p>
      </div>
    </AnimatedSection>
  )
}

function FindingTheNameSectionRpg() {
  const { ref, visible } = useSlideReveal({ threshold: 0.2 })

  return (
    <div
      ref={ref}
      className="relative mx-auto max-w-5xl w-full flex flex-col items-center justify-center"
    >
      <AnimatedSection className="text-center mb-10">
        <h2 className="rpg-pixel text-xl lg:text-2xl text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
          {m.talk_ls_rpg_name_zone()}
        </h2>
      </AnimatedSection>

      <AnimatedSection>
        <div className="rounded-2xl border-2 border-[#FFD700]/50 bg-gray-950/90 px-10 py-10 text-center max-w-md w-full shadow-[0_0_40px_rgba(255,215,0,0.15)]">
          <p className="rpg-pixel text-[10px] text-gray-400 mb-6 tracking-wider">
            {m.talk_ls_rpg_name_prompt()}
          </p>

          {/* Mock input showing LYRA — letter-by-letter typewriter */}
          <div className="rounded-lg border border-[#FFD700]/40 bg-black/60 px-6 py-4 mb-6 flex items-center justify-center gap-2">
            <span
              className="rpg-pixel text-xl text-[#FFD700] tracking-[0.3em] inline-block overflow-hidden whitespace-nowrap border-r-2 border-[#FFD700]"
              style={{
                textShadow: '0 0 20px rgba(255,215,0,0.6)',
                width: visible ? '4ch' : '0',
                transition: 'width 1.5s steps(4, end)',
              }}
            >
              {m.talk_ls_rpg_name_input()}
            </span>
            <span
              className="inline-block w-[3px] h-6 bg-[#FFD700]/80 rpg-blink"
              aria-hidden="true"
            />
          </div>

          <p className="rpg-pixel text-[9px] text-gray-400 mb-6 rpg-blink">
            {m.talk_ls_rpg_name_confirm()}
          </p>

          <p
            className="rpg-pixel text-[10px] text-[#50C878] drop-shadow-[0_0_8px_rgba(80,200,120,0.5)] transition-opacity duration-700"
            style={{ opacity: visible ? 1 : 0, transitionDelay: visible ? '2s' : '0ms' }}
          >
            {m.talk_ls_rpg_name_confirmed()}
          </p>
        </div>
      </AnimatedSection>
    </div>
  )
}

export function FindingTheNameSection() {
  const { isRpg } = useLyraMode()
  const { ref, visible } = useSlideReveal()
  if (isRpg) return <FindingTheNameSectionRpg />

  return (
    <div className="relative mx-auto max-w-5xl w-full">
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

        <div ref={ref} className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <SoleneCard visible={visible} />
          <TransformArrow visible={visible} />
          <LyraCard visible={visible} />
        </div>

        <AliasBlock />
      </div>
    </div>
  )
}
