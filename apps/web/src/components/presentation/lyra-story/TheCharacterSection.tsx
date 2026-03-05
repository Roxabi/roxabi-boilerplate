import { AnimatedSection, Card, CardContent, cn } from '@repo/ui'
import { Brain, Film, Layers, Mic2, Sparkles } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'
import { useSlideReveal } from './useSlideReveal'

const avatarVariants = [
  { icon: <Film className="h-5 w-5" />, color: 'blue' },
  { icon: <Layers className="h-5 w-5" />, color: 'purple' },
  { icon: <Sparkles className="h-5 w-5" />, color: 'blue' },
  { icon: <Brain className="h-5 w-5" />, color: 'purple' },
]

function TheCharacterSectionRpg() {
  return (
    <div className="relative mx-auto max-w-5xl w-full">
      {/* Achievement banner */}
      <AnimatedSection className="text-center mb-10">
        <div className="inline-block rounded-2xl border-2 border-[#FFD700]/60 bg-gradient-to-br from-[#FFD700]/10 to-amber-900/20 px-8 py-5 shadow-[0_0_40px_rgba(255,215,0,0.2)] rpg-achievement">
          <p className="rpg-pixel text-lg lg:text-xl text-[#FFD700] drop-shadow-[0_0_12px_rgba(255,215,0,0.6)]">
            {m.talk_ls_rpg_character_zone()}
          </p>
        </div>
      </AnimatedSection>

      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        {/* Portrait frame */}
        <AnimatedSection className="flex items-center justify-center">
          <div className="relative w-56 h-56 rounded-xl border-4 border-[#FFD700]/60 bg-gray-950/80 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.2),inset_0_0_30px_rgba(255,215,0,0.05)]">
            {/* Corner ornaments */}
            <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-[#FFD700]/80" />
            <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-[#FFD700]/80" />
            <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-[#FFD700]/80" />
            <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-[#FFD700]/80" />
            <span
              className="text-7xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.5))',
              }}
            >
              L
            </span>
            {/* Achievement badge */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-[#FFD700]/60 bg-gray-950 px-3 py-1">
              <span className="rpg-pixel text-[7px] text-[#FFD700]">
                {m.talk_ls_rpg_character_achievement()}
              </span>
            </div>
          </div>
        </AnimatedSection>

        {/* Stats */}
        <div className="space-y-4">
          <AnimatedSection>
            <div className="rounded-xl border border-[#FFD700]/30 bg-gray-950/60 px-5 py-4">
              <p className="rpg-pixel text-[8px] text-[#FFD700]/60 mb-2 tracking-wider uppercase">
                {m.talk_ls_character_personality_label()}
              </p>
              <p className="text-gray-200">{m.talk_ls_rpg_character_stat_personality()}</p>
            </div>
          </AnimatedSection>
          <AnimatedSection>
            <div className="rounded-xl border border-[#FFD700]/30 bg-gray-950/60 px-5 py-4">
              <p className="rpg-pixel text-[8px] text-[#FFD700]/60 mb-2 tracking-wider uppercase">
                {m.talk_ls_character_voice_label()}
              </p>
              <p className="text-gray-200">{m.talk_ls_rpg_character_stat_voice()}</p>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </div>
  )
}

export function TheCharacterSection() {
  const { isRpg } = useLyraMode()
  const { ref, visible } = useSlideReveal({ threshold: 0.2 })
  if (isRpg) return <TheCharacterSectionRpg />

  const avatarLabels = [
    m.talk_ls_character_avatar1(),
    m.talk_ls_character_avatar2(),
    m.talk_ls_character_avatar3(),
    m.talk_ls_character_avatar4(),
  ]

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/6 blur-[130px] dark:bg-purple-500/15" />
        <div className="absolute right-1/4 top-0 h-[300px] w-[300px] -translate-y-1/4 rounded-full bg-blue-500/5 blur-[90px] dark:bg-blue-500/12" />
      </div>

      <div className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
        {/* Left — character portrait / abstract */}
        <div className="flex items-center justify-center">
          <div className="relative w-64 h-64">
            {/* Outer ring */}
            <div
              className="absolute inset-0 rounded-full border border-blue-500/20 dark:border-blue-500/30 animate-spin-slow"
              style={{ animationDuration: '20s' }}
            />
            {/* Inner ring */}
            <div
              className="absolute inset-4 rounded-full border border-purple-500/15 dark:border-purple-500/25 animate-spin-slow"
              style={{ animationDuration: '15s', animationDirection: 'reverse' }}
            />
            {/* Core glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-32 w-32">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-xl" />
                <div className="absolute inset-0 rounded-full border-2 border-blue-400/40 dark:border-blue-400/60 flex items-center justify-center">
                  <span className="text-4xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 dark:from-blue-300 dark:to-purple-300 bg-clip-text text-transparent">
                    L
                  </span>
                </div>
              </div>
            </div>
            {/* Orbiting dots */}
            <div
              className="absolute inset-0 animate-spin-slow"
              style={{ animationDuration: '12s' }}
            >
              <div className="absolute top-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-blue-400/70" />
            </div>
            <div
              className="absolute inset-0 animate-spin-slow"
              style={{ animationDuration: '18s', animationDirection: 'reverse' }}
            >
              <div className="absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-purple-400/60" />
            </div>
          </div>
        </div>

        {/* Right — character traits */}
        <div>
          <AnimatedSection>
            <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-6">
              {m.talk_ls_character_title()}
            </h2>
          </AnimatedSection>

          <AnimatedSection className="space-y-4">
            <Card variant="subtle" className="border border-blue-500/20 bg-blue-500/5">
              <CardContent className="pt-5 pb-5 flex items-start gap-3">
                <Brain className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {m.talk_ls_character_personality_label()}
                  </p>
                  <p className="text-foreground">{m.talk_ls_character_personality()}</p>
                </div>
              </CardContent>
            </Card>

            <Card variant="subtle" className="border border-purple-500/20 bg-purple-500/5">
              <CardContent className="pt-5 pb-5 flex items-start gap-3">
                <Mic2 className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {m.talk_ls_character_voice_label()}
                  </p>
                  <p className="text-foreground">{m.talk_ls_character_voice()}</p>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Avatar variants */}
          <div ref={ref} className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {m.talk_ls_character_avatar_label()}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {avatarVariants.map((variant, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static ordered avatar variant list
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all duration-600',
                    visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
                    variant.color === 'blue'
                      ? 'border-blue-500/20 bg-blue-500/5 text-blue-300'
                      : 'border-purple-500/20 bg-purple-500/5 text-purple-300'
                  )}
                  style={{ transitionDelay: visible ? `${index * 80}ms` : '0ms' }}
                >
                  <span className={variant.color === 'blue' ? 'text-blue-400' : 'text-purple-400'}>
                    {variant.icon}
                  </span>
                  <span className="font-mono text-xs">{avatarLabels[index]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
