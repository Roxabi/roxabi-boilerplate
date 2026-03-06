import { cn, PresentationNav } from '@repo/ui'
import { createLazyFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import { AwakeningDivider } from '@/components/presentation/lyra-story/AwakeningDivider'
import { BreakingThingsSection } from '@/components/presentation/lyra-story/BreakingThingsSection'
import { BuildingHabitsSection } from '@/components/presentation/lyra-story/BuildingHabitsSection'
import { CharacterSheetSection } from '@/components/presentation/lyra-story/CharacterSheetSection'
import { ClosingSection } from '@/components/presentation/lyra-story/ClosingSection'
import { computeCompanionStage } from '@/components/presentation/lyra-story/companionStage'
import { FindingTheNameSection } from '@/components/presentation/lyra-story/FindingTheNameSection'
import { LettingGoSection } from '@/components/presentation/lyra-story/LettingGoSection'
import { LyraCompanion } from '@/components/presentation/lyra-story/LyraCompanion'
import { LyraModeProvider, useLyraMode } from '@/components/presentation/lyra-story/LyraModeContext'
import type { AvatarVariant } from '@/components/presentation/lyra-story/lyra.constants'
import { ModeToggle } from '@/components/presentation/lyra-story/ModeToggle'
import { NextStepsSection } from '@/components/presentation/lyra-story/NextStepsSection'
import { RpgHud } from '@/components/presentation/lyra-story/RpgHud'
import { RpgSectionChrome } from '@/components/presentation/lyra-story/RpgSectionChrome'
import { SimpleIdeaSection } from '@/components/presentation/lyra-story/SimpleIdeaSection'
import { TheBrainSection } from '@/components/presentation/lyra-story/TheBrainSection'
import { TheCharacterSection } from '@/components/presentation/lyra-story/TheCharacterSection'
import { TheEcosystemSection } from '@/components/presentation/lyra-story/TheEcosystemSection'
import { TheLessonSection } from '@/components/presentation/lyra-story/TheLessonSection'
import { TheMessengerSection } from '@/components/presentation/lyra-story/TheMessengerSection'
import { TheNightSection } from '@/components/presentation/lyra-story/TheNightSection'
import { TheNumbersSection } from '@/components/presentation/lyra-story/TheNumbersSection'
import { TheVoiceSection } from '@/components/presentation/lyra-story/TheVoiceSection'
import { TitleSection } from '@/components/presentation/lyra-story/TitleSection'
import { SectionContainer } from '@/components/presentation/SectionContainer'
import { ThemeToggle } from '@/components/ThemeToggle'
import { m } from '@/paraglide/messages'
import {
  AVATAR_POSITIONS,
  AVATAR_SIZES,
  AVATAR_VARIANTS,
  type AvatarPosition,
} from '@/routes/talks/lyra-story'

export const Route = createLazyFileRoute('/talks/lyra-story')({
  component: LyraStoryPresentation,
})

const sectionIds = [
  'title',
  'simple-idea',
  'breaking-things',
  'building-habits',
  'the-brain',
  'the-messenger',
  'letting-go',
  'the-voice',
  'the-night',
  'finding-name',
  'the-character',
  'the-ecosystem',
  'the-numbers',
  'character-sheet',
  'awakening',
  'the-lesson',
  'next-steps',
  'closing',
]

export function LyraStoryPresentation() {
  return (
    <LyraModeProvider>
      <LyraStoryContent />
    </LyraModeProvider>
  )
}

// 'awakening' is a thin divider — not a companion stage; precomputed from module-level constant
const AWAKENING_IDX = sectionIds.indexOf('awakening')
if (AWAKENING_IDX === -1)
  throw new Error("'awakening' missing from sectionIds — check the sectionIds array")

const VARIANT_LABELS: Record<AvatarVariant, string> = {
  quantum: 'Q',
  constellation: 'C',
  'rpg-canvas': 'RPG',
  tamagotchi: 'T',
  silhouette: 'S',
  blob: 'B',
  pokemon: 'P',
}

const POSITION_CLASSES: Record<AvatarPosition, string> = {
  'bottom-right': 'bottom-6 right-16',
  'bottom-left': 'bottom-6 left-6',
  'top-right': 'top-20 right-16',
  'top-left': 'top-20 left-6',
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

function LyraStoryContent() {
  const navigate = useNavigate()
  const handleEscape = useCallback(() => navigate({ to: '/talks' }), [navigate])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { isRpg, mode } = useLyraMode()
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)

  const { mode: talkMode, avatar, avatarSize, avatarPos } = useSearch({ from: '/talks/lyra-story' })

  // Stable ref so the keydown listener never needs to re-register on param changes
  const avatarParamsRef = useRef({ avatar, avatarSize, avatarPos })
  useEffect(() => {
    avatarParamsRef.current = { avatar, avatarSize, avatarPos }
  }, [avatar, avatarSize, avatarPos])

  // talkMode stays in dep array so navigate() always writes the current mode.
  // avatar/size/pos are read via ref to keep setAvatarParam stable, avoiding
  // keydown listener re-registration on every param change.
  const setAvatarParam = useCallback(
    (params: { avatar?: AvatarVariant; avatarSize?: number; avatarPos?: AvatarPosition }) =>
      navigate({
        to: '/talks/lyra-story',
        search: {
          mode: talkMode,
          avatar: params.avatar ?? avatarParamsRef.current.avatar,
          avatarSize: params.avatarSize ?? avatarParamsRef.current.avatarSize,
          avatarPos: params.avatarPos ?? avatarParamsRef.current.avatarPos,
        },
        replace: true,
      }),
    [navigate, talkMode]
  )

  // Keyboard shortcuts: V = cycle variant, [/] = resize, P = cycle position
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

  const companionStage = computeCompanionStage(currentSectionIndex, AWAKENING_IDX)

  useEffect(() => {
    const callback: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const index = sectionIds.indexOf(entry.target.id)
          if (index !== -1) setCurrentSectionIndex(index)
        }
      }
    }
    // Use a lower threshold for the thin awakening divider to avoid erratic jumps
    const defaultObserver = new IntersectionObserver(callback, { threshold: 0.5 })
    const awakeningObserver = new IntersectionObserver(callback, { threshold: 0.1 })
    for (const id of sectionIds) {
      const el = document.getElementById(id)
      if (el) {
        if (id === 'awakening') {
          awakeningObserver.observe(el)
        } else {
          defaultObserver.observe(el)
        }
      }
    }
    return () => {
      defaultObserver.disconnect()
      awakeningObserver.disconnect()
    }
  }, [])

  const sections = useMemo(
    () => [
      { id: 'title', label: isRpg ? m.talk_ls_rpg_nav_title() : m.talk_ls_nav_title() },
      {
        id: 'simple-idea',
        label: isRpg ? m.talk_ls_rpg_nav_simple_idea() : m.talk_ls_nav_simple_idea(),
      },
      {
        id: 'breaking-things',
        label: isRpg ? m.talk_ls_rpg_nav_breaking() : m.talk_ls_nav_breaking(),
      },
      { id: 'building-habits', label: isRpg ? m.talk_ls_rpg_nav_habits() : m.talk_ls_nav_habits() },
      { id: 'the-brain', label: isRpg ? m.talk_ls_rpg_nav_brain() : m.talk_ls_nav_brain() },
      {
        id: 'the-messenger',
        label: isRpg ? m.talk_ls_rpg_nav_messenger() : m.talk_ls_nav_messenger(),
      },
      {
        id: 'letting-go',
        label: isRpg ? m.talk_ls_rpg_nav_letting_go() : m.talk_ls_nav_letting_go(),
      },
      { id: 'the-voice', label: isRpg ? m.talk_ls_rpg_nav_voice() : m.talk_ls_nav_voice() },
      { id: 'the-night', label: isRpg ? m.talk_ls_rpg_nav_night() : m.talk_ls_nav_night() },
      { id: 'finding-name', label: isRpg ? m.talk_ls_rpg_nav_name() : m.talk_ls_nav_name() },
      {
        id: 'the-character',
        label: isRpg ? m.talk_ls_rpg_nav_character() : m.talk_ls_nav_character(),
      },
      {
        id: 'the-ecosystem',
        label: isRpg ? m.talk_ls_rpg_nav_ecosystem() : m.talk_ls_nav_ecosystem(),
      },
      { id: 'the-numbers', label: isRpg ? m.talk_ls_rpg_nav_numbers() : m.talk_ls_nav_numbers() },
      { id: 'character-sheet', label: isRpg ? m.talk_ls_rpg_nav_sheet() : m.talk_ls_nav_sheet() },
      { id: 'awakening', label: m.talk_ls_nav_awakening() },
      { id: 'the-lesson', label: isRpg ? m.talk_ls_rpg_nav_lesson() : m.talk_ls_nav_lesson() },
      { id: 'next-steps', label: isRpg ? m.talk_ls_rpg_nav_next() : m.talk_ls_nav_next() },
      { id: 'closing', label: isRpg ? m.talk_ls_rpg_nav_closing() : m.talk_ls_nav_closing() },
    ],
    [isRpg]
  )

  return (
    <div data-presentation data-mode={mode} className="relative bg-background text-foreground">
      {/* Roxabi wordmark */}
      <div className="fixed left-6 top-6 z-50">
        <Link
          to="/"
          className="text-sm font-bold tracking-wider text-muted-foreground/70 hover:text-foreground transition-colors uppercase"
        >
          Roxabi
        </Link>
      </div>

      {/* Locale switcher + Theme toggle + Mode toggle */}
      <div className="fixed right-6 top-6 z-50 flex items-center gap-2">
        <ModeToggle />
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      {/* RPG HUD overlay */}
      <RpgHud currentSectionIndex={currentSectionIndex} totalSections={sections.length} />

      {/* Lyra avatar companion — evolves with each section.
          Hidden on mobile (hidden md:block) — presenter uses a desktop + slide clicker.
          TODO: add a mobile FAB for touch control if needed. */}
      <div className={cn('fixed z-40 hidden md:block group', POSITION_CLASSES[avatarPos])}>
        <Link to="/talks/lyra-companion-test" aria-label="Open avatar playground">
          <LyraCompanion stage={companionStage} variant={avatar} size={avatarSize} />
        </Link>

        {/* Hover-reveal controls */}
        <div className="mt-1 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
          {/* Variant chips */}
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
          {/* Size chips */}
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
          {/* Keyboard shortcut hints */}
          <div className="flex items-center gap-2 rounded-lg bg-black/40 backdrop-blur-sm px-2 py-1">
            {KEYBOARD_HINTS.map(({ key, label }) => (
              <span key={key} className="text-[9px] font-mono text-white/30">
                <span className="text-white/50">{key}</span> {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Section navigation dots */}
      <PresentationNav
        sections={sections}
        onEscape={handleEscape}
        scrollContainerRef={scrollContainerRef}
        syncHash
      />

      {/* Scroll-snap container -- disabled on mobile */}
      <div
        ref={scrollContainerRef}
        className="md:h-dvh md:overflow-y-auto md:snap-y md:snap-mandatory"
      >
        <SectionContainer id="title" className="relative">
          <RpgSectionChrome sectionId="title" />
          <TitleSection />
        </SectionContainer>

        <SectionContainer id="simple-idea" className="relative">
          <RpgSectionChrome sectionId="simple-idea" />
          <SimpleIdeaSection />
        </SectionContainer>

        <SectionContainer id="breaking-things" className="relative">
          <RpgSectionChrome sectionId="breaking-things" />
          <BreakingThingsSection />
        </SectionContainer>

        <SectionContainer id="building-habits" className="relative">
          <RpgSectionChrome sectionId="building-habits" />
          <BuildingHabitsSection />
        </SectionContainer>

        <SectionContainer id="the-brain" className="relative">
          <RpgSectionChrome sectionId="the-brain" />
          <TheBrainSection />
        </SectionContainer>

        <SectionContainer id="the-messenger" className="relative">
          <RpgSectionChrome sectionId="the-messenger" />
          <TheMessengerSection />
        </SectionContainer>

        <SectionContainer id="letting-go" className="relative">
          <RpgSectionChrome sectionId="letting-go" />
          <LettingGoSection />
        </SectionContainer>

        <SectionContainer id="the-voice" className="relative">
          <RpgSectionChrome sectionId="the-voice" />
          <TheVoiceSection />
        </SectionContainer>

        <SectionContainer
          id="the-night"
          className="relative bg-gradient-to-b from-[#0a0a1a] via-[#0d1025] to-[#0a0a1a] dark:from-[#050510] dark:via-[#080818] dark:to-[#050510] text-gray-100"
        >
          <RpgSectionChrome sectionId="the-night" />
          <TheNightSection />
        </SectionContainer>

        <SectionContainer id="awakening">
          <AwakeningDivider />
        </SectionContainer>

        <SectionContainer id="finding-name" className="relative">
          <RpgSectionChrome sectionId="finding-name" />
          <FindingTheNameSection />
        </SectionContainer>

        <SectionContainer id="the-character" className="relative">
          <RpgSectionChrome sectionId="the-character" />
          <TheCharacterSection />
        </SectionContainer>

        <SectionContainer id="the-ecosystem" className="relative">
          <RpgSectionChrome sectionId="the-ecosystem" />
          <TheEcosystemSection />
        </SectionContainer>

        <SectionContainer id="the-numbers" className="relative">
          <RpgSectionChrome sectionId="the-numbers" />
          <TheNumbersSection />
        </SectionContainer>

        <SectionContainer id="character-sheet" className="relative">
          <RpgSectionChrome sectionId="character-sheet" />
          <CharacterSheetSection />
        </SectionContainer>

        <SectionContainer id="the-lesson" className="relative">
          <RpgSectionChrome sectionId="the-lesson" />
          <TheLessonSection />
        </SectionContainer>

        <SectionContainer id="next-steps" className="relative">
          <RpgSectionChrome sectionId="next-steps" />
          <NextStepsSection />
        </SectionContainer>

        <SectionContainer id="closing" className="relative">
          <RpgSectionChrome sectionId="closing" />
          <ClosingSection />
        </SectionContainer>
      </div>
    </div>
  )
}
