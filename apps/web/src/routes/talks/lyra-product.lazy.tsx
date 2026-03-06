import { cn, PresentationNav } from '@repo/ui'
import { createLazyFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import { ClosingSection } from '@/components/presentation/lyra-product/ClosingSection'
import { IndustrialTurnSection } from '@/components/presentation/lyra-product/IndustrialTurnSection'
import { KillDarlingsSection } from '@/components/presentation/lyra-product/KillDarlingsSection'
import { KnowledgeRadarSection } from '@/components/presentation/lyra-product/KnowledgeRadarSection'
import { LyraIn4DaysSection } from '@/components/presentation/lyra-product/LyraIn4DaysSection'
import { LyraNotSoleneSection } from '@/components/presentation/lyra-product/LyraNotSoleneSection'
import { PatchNotesSection } from '@/components/presentation/lyra-product/PatchNotesSection'
import { PivotSpeedSection } from '@/components/presentation/lyra-product/PivotSpeedSection'
import { PRODUCT_SECTION_IDS } from '@/components/presentation/lyra-product/productConfig'
import { SectionChrome } from '@/components/presentation/lyra-product/SectionChrome'
import { SharedFoundationSection } from '@/components/presentation/lyra-product/SharedFoundationSection'
import { TelegramSection } from '@/components/presentation/lyra-product/TelegramSection'
import { TheDaySection } from '@/components/presentation/lyra-product/TheDaySection'
import { TheEcosystemSection } from '@/components/presentation/lyra-product/TheEcosystemSection'
import { TheLessonSection } from '@/components/presentation/lyra-product/TheLessonSection'
import { TheNightSection } from '@/components/presentation/lyra-product/TheNightSection'
import { TheNumbersSection } from '@/components/presentation/lyra-product/TheNumbersSection'
import { TitleSection } from '@/components/presentation/lyra-product/TitleSection'
import { VoiceSection } from '@/components/presentation/lyra-product/VoiceSection'
import { WrongBetSection } from '@/components/presentation/lyra-product/WrongBetSection'
import { LyraCompanion } from '@/components/presentation/lyra-story/LyraCompanion'
import { SectionContainer } from '@/components/presentation/SectionContainer'
import { ThemeToggle } from '@/components/ThemeToggle'
import { m } from '@/paraglide/messages'
import {
  AVATAR_POSITIONS,
  AVATAR_SIZES,
  AVATAR_VARIANTS,
  type AvatarPosition,
  type AvatarVariant,
} from '@/routes/talks/lyra-product'

export const Route = createLazyFileRoute('/talks/lyra-product')({
  component: LyraProductPresentation,
})

const sectionIds = PRODUCT_SECTION_IDS

const POSITION_CLASSES: Record<AvatarPosition, string> = {
  'bottom-right': 'bottom-6 right-16',
  'bottom-left': 'bottom-6 left-6',
  'top-right': 'top-20 right-16',
  'top-left': 'top-20 left-6',
}

const VARIANT_LABELS: Record<AvatarVariant, string> = {
  quantum: 'Q',
  constellation: 'C',
  'rpg-canvas': 'RPG',
  tamagotchi: 'T',
  silhouette: 'S',
  blob: 'B',
  pokemon: 'P',
}

const KEYBOARD_HINTS = [
  { key: 'V', label: 'variant' },
  { key: '[', label: 'smaller' },
  { key: ']', label: 'larger' },
  { key: 'P', label: 'position' },
] as const

function ChipButton({
  active,
  onClick,
  title,
  'aria-label': ariaLabel,
  children,
}: {
  active: boolean
  onClick: () => void
  title?: string
  'aria-label'?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'text-[9px] font-mono px-1 py-0.5 rounded transition-colors',
        active ? 'text-white bg-white/20' : 'text-white/40 hover:text-white/80'
      )}
    >
      {children}
    </button>
  )
}

export function LyraProductPresentation() {
  const sections = [
    { id: 'title', label: m.talk_lp_nav_title() },
    { id: 'wrong-bet', label: m.talk_lp_nav_wrong_bet() },
    { id: 'pivot-speed', label: m.talk_lp_nav_pivot() },
    { id: 'kill-darlings', label: m.talk_lp_nav_kill() },
    { id: 'shared-foundation', label: m.talk_lp_nav_foundation() },
    { id: 'knowledge-radar', label: m.talk_lp_nav_radar() },
    { id: 'telegram-anywhere', label: m.talk_lp_nav_telegram() },
    { id: 'industrial-turn', label: m.talk_lp_nav_process() },
    { id: 'patch-notes', label: m.talk_lp_nav_changelog() },
    { id: 'the-day', label: m.talk_lp_nav_explosion() },
    { id: 'voice', label: m.talk_lp_nav_voice() },
    { id: 'the-night', label: m.talk_lp_nav_night() },
    { id: 'lyra-not-solene', label: m.talk_lp_nav_identity() },
    { id: 'the-ecosystem', label: m.talk_lp_nav_ecosystem() },
    { id: 'the-numbers', label: m.talk_lp_nav_numbers() },
    { id: 'lyra-in-4-days', label: m.talk_lp_nav_four_days() },
    { id: 'the-lesson', label: m.talk_lp_nav_lesson() },
    { id: 'closing', label: m.talk_lp_nav_closing() },
  ]
  const navigate = useNavigate()
  const handleEscape = useCallback(() => navigate({ to: '/talks' }), [navigate])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)

  const { avatar, avatarSize, avatarPos } = useSearch({ from: '/talks/lyra-product' })

  // Stable ref for keydown handler — avoids re-registering on every param change
  const avatarParamsRef = useRef({ avatar, avatarSize, avatarPos })
  useEffect(() => {
    avatarParamsRef.current = { avatar, avatarSize, avatarPos }
  }, [avatar, avatarSize, avatarPos])

  const setAvatarParam = useCallback(
    (params: { avatar?: AvatarVariant; avatarSize?: number; avatarPos?: AvatarPosition }) =>
      navigate({
        to: '/talks/lyra-product',
        search: {
          avatar: params.avatar ?? avatarParamsRef.current.avatar,
          avatarSize: params.avatarSize ?? avatarParamsRef.current.avatarSize,
          avatarPos: params.avatarPos ?? avatarParamsRef.current.avatarPos,
        },
        replace: true,
      }),
    [navigate]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const { avatar: av, avatarSize: sz, avatarPos: pos } = avatarParamsRef.current
      if (e.key === 'v' || e.key === 'V') {
        const idx = AVATAR_VARIANTS.indexOf(av)
        setAvatarParam({ avatar: AVATAR_VARIANTS[(idx + 1) % AVATAR_VARIANTS.length] })
      } else if (e.key === ']') {
        const idx = AVATAR_SIZES.indexOf(sz as (typeof AVATAR_SIZES)[number])
        setAvatarParam({ avatarSize: AVATAR_SIZES[Math.min(idx + 1, AVATAR_SIZES.length - 1)] })
      } else if (e.key === '[') {
        const idx = AVATAR_SIZES.indexOf(sz as (typeof AVATAR_SIZES)[number])
        setAvatarParam({ avatarSize: AVATAR_SIZES[Math.max(idx - 1, 0)] })
      } else if (e.key === 'p' || e.key === 'P') {
        const idx = AVATAR_POSITIONS.indexOf(pos)
        setAvatarParam({ avatarPos: AVATAR_POSITIONS[(idx + 1) % AVATAR_POSITIONS.length] })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setAvatarParam])

  useEffect(() => {
    const callback: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const index = sectionIds.indexOf(entry.target.id)
          if (index !== -1) setCurrentSectionIndex(index)
        }
      }
    }
    const observer = new IntersectionObserver(callback, {
      threshold: 0.5,
      root: scrollContainerRef.current,
    })
    for (const id of sectionIds) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <div
      data-presentation
      data-mode="product"
      className="relative bg-[#0d0a07] text-foreground min-h-dvh"
    >
      {/* Roxabi wordmark */}
      <div className="fixed left-6 top-6 z-50">
        <Link
          to="/"
          className="font-mono text-xs font-bold tracking-wider text-amber-400/50 hover:text-amber-400 transition-colors uppercase"
        >
          Roxabi
        </Link>
      </div>

      {/* Controls */}
      <div className="fixed right-6 top-6 z-50 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      {/* Progress counter */}
      <div className="fixed left-6 bottom-6 z-50 hidden md:block">
        <p className="font-mono text-[9px] tracking-widest text-amber-400/40 uppercase">
          {currentSectionIndex + 1} / {sectionIds.length}
        </p>
      </div>

      {/* Lyra avatar companion — hidden on mobile */}
      <div className={cn('fixed z-40 hidden md:block group', POSITION_CLASSES[avatarPos])}>
        <Link to="/talks/lyra-companion-test" aria-label="Open avatar playground">
          <LyraCompanion stage={currentSectionIndex} variant={avatar} size={avatarSize} />
        </Link>

        {/* Hover-reveal controls */}
        <div className="mt-1 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-sm px-2 py-1">
            {AVATAR_VARIANTS.map((v) => (
              <ChipButton
                key={v}
                active={avatar === v}
                onClick={() => setAvatarParam({ avatar: v })}
                title={v}
                aria-label={`Switch to ${v} variant`}
              >
                {VARIANT_LABELS[v]}
              </ChipButton>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-sm px-2 py-1">
            {AVATAR_SIZES.map((s) => (
              <ChipButton
                key={s}
                active={avatarSize === s}
                onClick={() => setAvatarParam({ avatarSize: s })}
                aria-label={`Set size to ${s}`}
              >
                {s}
              </ChipButton>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-black/40 backdrop-blur-sm px-2 py-1">
            {KEYBOARD_HINTS.map(({ key, label }) => (
              <span key={key} className="text-[9px] font-mono text-white/30">
                <span className="text-white/50">{key}</span> {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Section navigation */}
      <PresentationNav
        sections={sections}
        onEscape={handleEscape}
        scrollContainerRef={scrollContainerRef}
        syncHash
      />

      {/* Scroll-snap container */}
      <div
        ref={scrollContainerRef}
        className="md:h-dvh md:overflow-y-auto md:snap-y md:snap-mandatory"
      >
        <SectionContainer id="title" className="relative">
          <SectionChrome sectionId="title" />
          <TitleSection />
        </SectionContainer>

        <SectionContainer id="wrong-bet" className="relative">
          <SectionChrome sectionId="wrong-bet" />
          <WrongBetSection />
        </SectionContainer>

        <SectionContainer id="pivot-speed" className="relative">
          <SectionChrome sectionId="pivot-speed" />
          <PivotSpeedSection />
        </SectionContainer>

        <SectionContainer id="kill-darlings" className="relative">
          <SectionChrome sectionId="kill-darlings" />
          <KillDarlingsSection />
        </SectionContainer>

        <SectionContainer id="shared-foundation" className="relative">
          <SectionChrome sectionId="shared-foundation" />
          <SharedFoundationSection />
        </SectionContainer>

        <SectionContainer id="knowledge-radar" className="relative">
          <SectionChrome sectionId="knowledge-radar" />
          <KnowledgeRadarSection />
        </SectionContainer>

        <SectionContainer id="telegram-anywhere" className="relative">
          <SectionChrome sectionId="telegram-anywhere" />
          <TelegramSection />
        </SectionContainer>

        <SectionContainer id="industrial-turn" className="relative">
          <SectionChrome sectionId="industrial-turn" />
          <IndustrialTurnSection />
        </SectionContainer>

        <SectionContainer id="patch-notes" className="relative">
          <SectionChrome sectionId="patch-notes" />
          <PatchNotesSection />
        </SectionContainer>

        <SectionContainer id="the-day" className="relative">
          <SectionChrome sectionId="the-day" />
          <TheDaySection />
        </SectionContainer>

        <SectionContainer id="voice" className="relative">
          <SectionChrome sectionId="voice" />
          <VoiceSection />
        </SectionContainer>

        <SectionContainer id="the-night" className="relative bg-[#0a0005]">
          <SectionChrome sectionId="the-night" />
          <TheNightSection />
        </SectionContainer>

        <SectionContainer id="lyra-not-solene" className="relative">
          <SectionChrome sectionId="lyra-not-solene" />
          <LyraNotSoleneSection />
        </SectionContainer>

        <SectionContainer id="the-ecosystem" className="relative">
          <SectionChrome sectionId="the-ecosystem" />
          <TheEcosystemSection />
        </SectionContainer>

        <SectionContainer id="the-numbers" className="relative">
          <SectionChrome sectionId="the-numbers" />
          <TheNumbersSection />
        </SectionContainer>

        <SectionContainer id="lyra-in-4-days" className="relative">
          <SectionChrome sectionId="lyra-in-4-days" />
          <LyraIn4DaysSection />
        </SectionContainer>

        <SectionContainer id="the-lesson" className="relative">
          <SectionChrome sectionId="the-lesson" />
          <TheLessonSection />
        </SectionContainer>

        <SectionContainer id="closing" className="relative">
          <SectionChrome sectionId="closing" />
          <ClosingSection />
        </SectionContainer>
      </div>
    </div>
  )
}
