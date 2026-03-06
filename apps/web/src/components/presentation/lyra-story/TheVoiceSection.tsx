import { AnimatedSection, Badge, Card, CardContent, cn } from '@repo/ui'
import { ArrowRight, Mic, Mic2, Plus, Zap } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'
import { WaveParticle } from './WaveParticle'

function TheVoiceSectionRpg() {
  const ingredients = [
    { label: m.talk_ls_rpg_voice_ingredient1(), icon: <Mic2 className="h-5 w-5 text-amber-400" /> },
    { label: m.talk_ls_rpg_voice_ingredient2(), icon: <Mic className="h-5 w-5 text-purple-400" /> },
    { label: m.talk_ls_rpg_voice_ingredient3(), icon: <Zap className="h-5 w-5 text-amber-300" /> },
  ]

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 text-sm font-mono text-amber-400 tracking-widest uppercase rpg-pixel text-[10px] rpg-zone-enter">
            {m.talk_ls_rpg_voice_zone()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2 rpg-pixel leading-tight text-amber-300">
            CRAFTING BENCH
          </h2>
        </AnimatedSection>

        {/* Crafting layout: ingredients → result */}
        <AnimatedSection className="mt-10">
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:items-center">
            {/* Ingredients with "+" between them */}
            <div className="flex flex-col gap-2">
              {ingredients.map((ing, index) => (
                <div key={ing.label} className="flex flex-col items-center gap-2">
                  <Card variant="subtle" className="border border-amber-500/30 bg-amber-500/5 w-48">
                    <CardContent className="pt-4 pb-4 flex items-center gap-3">
                      {ing.icon}
                      <p className="font-mono text-xs text-amber-200/80">{ing.label}</p>
                    </CardContent>
                  </Card>
                  {index < ingredients.length - 1 && <Plus className="h-4 w-4 text-amber-400/60" />}
                </div>
              ))}
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <ArrowRight
                className="h-8 w-8 text-yellow-400/80 rotate-90 md:rotate-0"
                style={{ filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.5))' }}
              />
            </div>

            {/* Result */}
            <Card
              variant="subtle"
              className="border-2 border-yellow-400/50 bg-yellow-500/8 w-56 rpg-achievement"
              style={{
                boxShadow: '0 0 30px rgba(255,215,0,0.2), 0 0 0 1px rgba(255,215,0,0.15)',
                animation: 'rpg-golden-pulse 2.5s ease-in-out infinite',
              }}
            >
              <CardContent className="pt-6 pb-6 text-center space-y-3">
                <Badge className="border border-yellow-400/50 bg-yellow-500/15 text-yellow-300 rpg-pixel text-[9px]">
                  CRAFTED
                </Badge>
                <p className="rpg-pixel text-sm text-yellow-300 leading-tight">
                  {m.talk_ls_rpg_voice_result()}
                </p>
                <div
                  className="mx-auto h-8 w-8 rounded-full bg-yellow-400/20 flex items-center justify-center"
                  style={{ boxShadow: '0 0 12px rgba(255,215,0,0.4)' }}
                >
                  <Mic2 className="h-4 w-4 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </AnimatedSection>

        {/* Speed stat */}
        <AnimatedSection className="mt-8 text-center">
          <p className="font-mono text-sm text-amber-200/70">{m.talk_ls_rpg_voice_speed()}</p>
        </AnimatedSection>
      </div>
    </div>
  )
}

export function TheVoiceSection() {
  const { isRpg } = useLyraMode()
  const systems = [
    {
      icon: <Mic2 className="h-5 w-5 text-amber-400" />,
      label: m.talk_ls_voice_tts_label(),
      desc: m.talk_ls_voice_tts_desc(),
      color: 'amber',
    },
    {
      icon: <Mic className="h-5 w-5 text-purple-400" />,
      label: m.talk_ls_voice_stt_label(),
      desc: m.talk_ls_voice_stt_desc(),
      color: 'purple',
    },
    {
      icon: <Zap className="h-5 w-5 text-amber-300" />,
      label: m.talk_ls_voice_fast_label(),
      desc: m.talk_ls_voice_fast_desc(),
      color: 'amber',
    },
  ]

  if (isRpg) return <TheVoiceSectionRpg />

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/4 blur-[130px] dark:bg-amber-500/8" />
        <div className="absolute right-0 top-1/4 h-[250px] w-[250px] translate-x-1/3 rounded-full bg-purple-500/6 blur-[80px] dark:bg-purple-500/12" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2">
            {m.talk_ls_voice_title()}
          </h2>
          <p className="text-lg text-muted-foreground">{m.talk_ls_voice_subtitle()}</p>
        </AnimatedSection>

        {/* Wave-Particle visual — the voice IS the wave */}
        <AnimatedSection className="mt-10">
          <div
            className="overflow-hidden"
            style={{
              mask: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent), linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
              WebkitMask:
                'linear-gradient(to right, transparent, black 12%, black 88%, transparent), linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'destination-in',
            }}
          >
            <WaveParticle />
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-10 grid gap-4 md:grid-cols-3">
          {systems.map((system) => (
            <Card
              key={system.label}
              variant="subtle"
              className={cn(
                'border',
                system.color === 'amber'
                  ? 'border-amber-500/20 bg-amber-500/5'
                  : 'border-purple-500/20 bg-purple-500/5'
              )}
            >
              <CardContent className="pt-5 pb-5 space-y-2">
                <div className="flex items-center gap-2">
                  {system.icon}
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      system.color === 'amber'
                        ? 'text-amber-600 dark:text-amber-300'
                        : 'text-purple-600 dark:text-purple-300'
                    )}
                  >
                    {system.label}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">{system.desc}</p>
              </CardContent>
            </Card>
          ))}
        </AnimatedSection>

        <AnimatedSection className="mt-10 text-center">
          <p className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-purple-600 dark:from-amber-300 dark:to-purple-300 bg-clip-text text-transparent lg:text-3xl">
            {m.talk_ls_voice_moment()}
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}
