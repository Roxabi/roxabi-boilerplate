import { cn } from '@repo/ui'
import { createLazyFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LyraCompanion } from '@/components/presentation/lyra-story/LyraCompanion'
import {
  AVATAR_POSITIONS,
  AVATAR_VARIANTS,
  type AvatarPosition,
  type AvatarVariant,
} from '@/components/presentation/lyra-story/lyra.constants'

export const Route = createLazyFileRoute('/talks/lyra-companion-test')({
  component: LyraCompanionTestPage,
})

const SLIDE_LABELS = [
  'Title — Empty void',
  'Simple Idea — Spark',
  'Breaking Things — Glitch',
  'Building Habits — Stable pulse',
  'The Brain — Core forms',
  'The Messenger — 2 rings',
  'Letting Go — Shedding',
  'The Voice — Wave appears',
  'The Night — Bloom',
  'Finding Name — "L" letter',
  'The Character — Full orbital',
  'The Ecosystem — Satellites',
  'The Numbers — Data sparkles',
  'Character Sheet — RPG frame',
  'The Lesson — Full radiance',
  'Next Steps — Forward',
  'Closing — Serene',
]

const VARIANT_LABELS: Record<AvatarVariant, string> = {
  quantum: 'Quantum',
  constellation: 'Stars',
  'rpg-canvas': 'RPG',
  tamagotchi: 'Tamagotchi',
  silhouette: 'Silhouette',
  blob: 'Blob',
  pokemon: 'Pokemon',
}

const SIZES = [48, 64, 80, 100, 120] as const

function LyraCompanionTestPage() {
  const [variant, setVariant] = useState<AvatarVariant>('quantum')
  const [position, setPosition] = useState<AvatarPosition>('bottom-right')
  const [size, setSize] = useState<number>(80)
  const [stage, setStage] = useState(0)
  const [bgMode, setBgMode] = useState<'dark' | 'light'>('dark')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.index)
            if (!Number.isNaN(index)) setStage(index)
          }
        }
      },
      { root: container, threshold: 0.5 }
    )

    for (const section of sectionRefs.current) {
      if (section) observer.observe(section)
    }

    return () => observer.disconnect()
  }, [])

  const setSectionRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      sectionRefs.current[index] = el
    },
    []
  )

  const positionClasses: Record<AvatarPosition, string> = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-20 right-6',
    'top-left': 'top-20 left-6',
  }

  const isDark = bgMode === 'dark'

  return (
    <div
      className={cn(
        'relative min-h-dvh',
        isDark ? 'bg-[#0a0a1a] text-gray-100' : 'bg-white text-gray-900'
      )}
    >
      {/* Control Panel — fixed top */}
      <div
        className={cn(
          'fixed top-0 left-0 right-0 z-50 px-4 py-2 backdrop-blur-xl border-b',
          isDark ? 'bg-gray-900/80 border-gray-700/50' : 'bg-white/80 border-gray-200'
        )}
      >
        <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-3 text-sm">
          <span className={cn('font-bold', isDark ? 'text-blue-400' : 'text-blue-600')}>
            Lyra Companion
          </span>
          <span className={cn('font-mono text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>
            {stage}/16
          </span>

          {/* Variant selector — scrollable row */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {AVATAR_VARIANTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVariant(v)}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-mono transition-colors whitespace-nowrap',
                  variant === v
                    ? isDark
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-blue-100 text-blue-700 border border-blue-300'
                    : isDark
                      ? 'text-gray-400 hover:text-gray-200 border border-transparent'
                      : 'text-gray-500 hover:text-gray-700 border border-transparent'
                )}
              >
                {VARIANT_LABELS[v]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Position */}
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as AvatarPosition)}
              className={cn(
                'text-xs rounded px-1.5 py-1 border',
                isDark
                  ? 'bg-gray-800 border-gray-700 text-gray-200'
                  : 'bg-white border-gray-300 text-gray-700'
              )}
            >
              {AVATAR_POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Size */}
            <div className="flex gap-0.5">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={cn(
                    'px-1.5 py-1 rounded text-[11px] font-mono transition-colors',
                    size === s
                      ? isDark
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-purple-100 text-purple-700 border border-purple-300'
                      : isDark
                        ? 'text-gray-400 hover:text-gray-200 border border-transparent'
                        : 'text-gray-500 hover:text-gray-700 border border-transparent'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* BG toggle */}
            <button
              type="button"
              onClick={() => setBgMode(bgMode === 'dark' ? 'light' : 'dark')}
              className={cn(
                'px-2 py-1 rounded text-xs border transition-colors',
                isDark
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'
              )}
            >
              {isDark ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </div>

      {/* Fixed Companion */}
      <div className={cn('fixed z-40 transition-all duration-500', positionClasses[position])}>
        <div
          className={cn(
            'rounded-xl p-2 backdrop-blur-sm transition-all duration-1000',
            isDark ? 'bg-gray-900/50' : 'bg-white/50 shadow-lg'
          )}
        >
          <LyraCompanion stage={stage} variant={variant} size={size} />
        </div>
        <div
          className={cn(
            'mt-1 text-center text-[10px] font-mono transition-colors',
            isDark ? 'text-gray-600' : 'text-gray-400'
          )}
        >
          {VARIANT_LABELS[variant]} {stage}/16
        </div>
      </div>

      {/* Bottom strip — all variants */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <div
          className={cn(
            'flex gap-2 rounded-2xl px-3 py-2 backdrop-blur-xl border',
            isDark ? 'bg-gray-900/70 border-gray-700/50' : 'bg-white/70 border-gray-200'
          )}
        >
          {AVATAR_VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              className={cn(
                'rounded-lg p-1 transition-all flex flex-col items-center gap-1',
                variant === v
                  ? isDark
                    ? 'ring-2 ring-blue-500/50 bg-blue-500/10'
                    : 'ring-2 ring-blue-400 bg-blue-50'
                  : isDark
                    ? 'hover:bg-gray-800/50'
                    : 'hover:bg-gray-100'
              )}
            >
              <LyraCompanion stage={stage} variant={v} size={40} />
              <span
                className={cn('text-[9px] font-mono', isDark ? 'text-gray-500' : 'text-gray-400')}
              >
                {VARIANT_LABELS[v]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable sections */}
      <div ref={scrollContainerRef} className="h-dvh overflow-y-auto snap-y snap-mandatory pt-12">
        {SLIDE_LABELS.map((label, index) => (
          <section
            key={label}
            ref={setSectionRef(index)}
            data-index={index}
            className="h-dvh snap-start flex flex-col items-center justify-center px-6 relative"
          >
            <div
              className={cn(
                'absolute top-16 left-6 font-mono text-xs',
                isDark ? 'text-gray-700' : 'text-gray-300'
              )}
            >
              {String(index + 1).padStart(2, '0')} / 17
            </div>

            {/* Stage dots */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
              {SLIDE_LABELS.map((_, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: static dot indicator
                  key={i}
                  className={cn(
                    'h-1.5 w-1.5 rounded-full transition-all duration-300',
                    i === stage
                      ? isDark
                        ? 'bg-blue-400 scale-150'
                        : 'bg-blue-500 scale-150'
                      : i < stage
                        ? isDark
                          ? 'bg-blue-400/30'
                          : 'bg-blue-300/50'
                        : isDark
                          ? 'bg-gray-700'
                          : 'bg-gray-300'
                  )}
                />
              ))}
            </div>

            <div className="max-w-2xl text-center space-y-4">
              <div
                className={cn(
                  'text-6xl font-bold tabular-nums font-mono',
                  isDark
                    ? 'bg-gradient-to-br from-blue-400 to-purple-400 bg-clip-text text-transparent'
                    : 'bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent'
                )}
              >
                {String(index).padStart(2, '0')}
              </div>
              <h2
                className={cn(
                  'text-2xl font-bold tracking-tight lg:text-3xl',
                  isDark ? 'text-gray-100' : 'text-gray-900'
                )}
              >
                {label.split(' — ')[0]}
              </h2>
              <p className={cn('text-lg italic', isDark ? 'text-gray-400' : 'text-gray-500')}>
                {label.split(' — ')[1]}
              </p>
              <div
                className={cn(
                  'mt-8 rounded-lg border px-6 py-4 text-sm font-mono',
                  isDark
                    ? 'border-gray-800 bg-gray-900/50 text-gray-500'
                    : 'border-gray-200 bg-gray-50 text-gray-400'
                )}
              >
                stage={index} &middot; t={Number((index / 16).toFixed(2))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
