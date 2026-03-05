import { AnimatedSection, cn } from '@repo/ui'
import { Trophy } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'
import { useSlideReveal } from './useSlideReveal'

function TheLessonSectionRpg() {
  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center text-center">
      <AnimatedSection>
        <div className="inline-block rounded-2xl border-2 border-[#FFD700]/60 bg-gray-950/80 px-10 py-8 shadow-[0_0_50px_rgba(255,215,0,0.2)] rpg-achievement max-w-lg w-full">
          <p className="rpg-pixel text-[9px] text-gray-400 mb-5 tracking-wider">
            {m.talk_ls_rpg_lesson_title()}
          </p>

          <div className="flex justify-center mb-5">
            <div className="rounded-full border border-[#FFD700]/40 bg-[#FFD700]/10 p-5">
              <Trophy className="h-10 w-10 text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]" />
            </div>
          </div>

          <p className="rpg-pixel text-sm text-[#FFD700] mb-4 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
            {m.talk_ls_rpg_lesson_name()}
          </p>

          <div className="h-px w-full bg-[#FFD700]/20 mb-4" />

          <p className="text-gray-300 text-sm leading-relaxed italic">
            {m.talk_ls_rpg_lesson_desc()}
          </p>
        </div>
      </AnimatedSection>
    </div>
  )
}

export function TheLessonSection() {
  const { isRpg } = useLyraMode()
  const { ref, visible } = useSlideReveal()
  if (isRpg) return <TheLessonSectionRpg />

  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center text-center">
      {/* Full-bleed atmospheric background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/6 blur-[160px] dark:bg-purple-500/18" />
        <div className="absolute left-1/4 top-1/3 h-[400px] w-[400px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-blue-500/5 blur-[120px] dark:bg-blue-500/14" />
        <div className="absolute right-1/4 bottom-1/3 h-[350px] w-[350px] translate-x-1/3 translate-y-1/3 rounded-full bg-blue-400/4 blur-[100px] dark:bg-blue-400/12" />
      </div>

      <div ref={ref} className="relative max-w-4xl">
        {/* Decorative quote marks */}
        <div
          className={cn(
            'text-8xl font-serif leading-none text-blue-500/15 dark:text-blue-400/20 transition-all duration-1000 mb-4 select-none',
            visible ? 'opacity-100' : 'opacity-0'
          )}
          aria-hidden="true"
        >
          "
        </div>

        <AnimatedSection>
          <h2 className="text-4xl font-bold tracking-tight leading-tight lg:text-5xl xl:text-6xl">
            <span className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-600 dark:from-blue-200 dark:via-white dark:to-purple-200 bg-clip-text text-transparent">
              {m.talk_ls_lesson_quote()}
            </span>
          </h2>
        </AnimatedSection>

        <div
          className={cn(
            'text-8xl font-serif leading-none text-purple-500/15 dark:text-purple-400/20 transition-all duration-1000 mt-4 text-right select-none',
            visible ? 'opacity-100' : 'opacity-0'
          )}
          style={{ transitionDelay: visible ? '200ms' : '0ms' }}
          aria-hidden="true"
        >
          "
        </div>

        <AnimatedSection className="mt-12">
          <p className="text-lg text-muted-foreground/80 italic max-w-2xl mx-auto lg:text-xl">
            {m.talk_ls_lesson_secondary()}
          </p>
        </AnimatedSection>

        {/* Decorative separator */}
        <AnimatedSection className="mt-12">
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-24 bg-gradient-to-r from-transparent to-blue-500/40" />
            <div className="h-2 w-2 rounded-full bg-blue-400/50" />
            <div className="h-px w-8 bg-blue-500/25" />
            <div className="h-3 w-3 rounded-full bg-gradient-to-br from-blue-400/60 to-purple-400/60" />
            <div className="h-px w-8 bg-purple-500/25" />
            <div className="h-2 w-2 rounded-full bg-purple-400/50" />
            <div className="h-px w-24 bg-gradient-to-l from-transparent to-purple-500/40" />
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}
