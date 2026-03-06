import { cn, PresentationNav } from '@repo/ui'
import { createLazyFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import {
  ChipButton,
  KEYBOARD_HINTS,
  POSITION_CLASSES,
  VARIANT_LABELS,
} from '@/components/presentation/AvatarControls'
import { AbandonedQuestSection } from '@/components/presentation/lyra-dev/AbandonedQuestSection'
import { AwakeningNightSection } from '@/components/presentation/lyra-dev/AwakeningNightSection'
import { BuildChangeSection } from '@/components/presentation/lyra-dev/BuildChangeSection'
import { CharacterCreationSection } from '@/components/presentation/lyra-dev/CharacterCreationSection'
import { CharacterSheetSection } from '@/components/presentation/lyra-dev/CharacterSheetSection'
import { ClosingSection } from '@/components/presentation/lyra-dev/ClosingSection'
import { CraftSystemSection } from '@/components/presentation/lyra-dev/CraftSystemSection'
import { DEV_SECTION_IDS } from '@/components/presentation/lyra-dev/devConfig'
import { EndgameSection } from '@/components/presentation/lyra-dev/EndgameSection'
import { GrandRespecSection } from '@/components/presentation/lyra-dev/GrandRespecSection'
import { GuildHallSection } from '@/components/presentation/lyra-dev/GuildHallSection'
import { IndustrializationSection } from '@/components/presentation/lyra-dev/IndustrializationSection'
import { PatchNotesSection } from '@/components/presentation/lyra-dev/PatchNotesSection'
import { QuestJournalSection } from '@/components/presentation/lyra-dev/QuestJournalSection'
import { SectionChrome } from '@/components/presentation/lyra-dev/SectionChrome'
import { SessionLogSection } from '@/components/presentation/lyra-dev/SessionLogSection'
import { SkillTreeSection } from '@/components/presentation/lyra-dev/SkillTreeSection'
import { TheLessonSection } from '@/components/presentation/lyra-dev/TheLessonSection'
import { TitleSection } from '@/components/presentation/lyra-dev/TitleSection'
import { TutorialZoneSection } from '@/components/presentation/lyra-dev/TutorialZoneSection'
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
} from '@/routes/talks/lyra-dev'

export const Route = createLazyFileRoute('/talks/lyra-dev')({
  component: LyraDevPresentation,
})

const sectionIds = DEV_SECTION_IDS

const sections = [
  { id: 'title', label: m.talk_ld_nav_title() },
  { id: 'character-creation', label: m.talk_ld_nav_char_creation() },
  { id: 'tutorial-zone', label: m.talk_ld_nav_tutorial() },
  { id: 'skill-tree', label: m.talk_ld_nav_skill_tree() },
  { id: 'abandoned-quest', label: m.talk_ld_nav_abandoned() },
  { id: 'build-change', label: m.talk_ld_nav_build_shift() },
  { id: 'grand-respec', label: m.talk_ld_nav_grand_respec() },
  { id: 'industrialization', label: m.talk_ld_nav_factory() },
  { id: 'patch-notes', label: m.talk_ld_nav_patch_notes() },
  { id: 'craft-system', label: m.talk_ld_nav_craft() },
  { id: 'awakening-night', label: m.talk_ld_nav_awakening() },
  { id: 'guild-hall', label: m.talk_ld_nav_guild_hall() },
  { id: 'quest-journal', label: m.talk_ld_nav_quest_journal() },
  { id: 'session-log', label: m.talk_ld_nav_session_log() },
  { id: 'endgame', label: m.talk_ld_nav_endgame() },
  { id: 'character-sheet', label: m.talk_ld_nav_char_sheet() },
  { id: 'the-lesson', label: m.talk_ld_nav_lesson() },
  { id: 'closing', label: m.talk_ld_nav_closing() },
]

export function LyraDevPresentation() {
  const navigate = useNavigate()
  const handleEscape = useCallback(() => navigate({ to: '/talks' }), [navigate])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)

  const { avatar, avatarSize, avatarPos } = useSearch({ from: '/talks/lyra-dev' })

  const avatarParamsRef = useRef({ avatar, avatarSize, avatarPos })
  useEffect(() => {
    avatarParamsRef.current = { avatar, avatarSize, avatarPos }
  }, [avatar, avatarSize, avatarPos])

  const setAvatarParam = useCallback(
    (params: { avatar?: AvatarVariant; avatarSize?: number; avatarPos?: AvatarPosition }) =>
      navigate({
        to: '/talks/lyra-dev',
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
      data-mode="mmorpg"
      className="relative bg-[#060d08] text-foreground min-h-dvh"
    >
      {/* Roxabi wordmark */}
      <div className="fixed left-6 top-6 z-50">
        <Link
          to="/"
          className="font-mono text-xs font-bold tracking-wider text-emerald-400/50 hover:text-emerald-400 transition-colors uppercase"
        >
          Roxabi
        </Link>
      </div>

      {/* Controls */}
      <div className="fixed right-6 top-6 z-50 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      {/* XP counter */}
      <div className="fixed left-6 bottom-6 z-50 hidden md:block">
        <p className="font-mono text-[9px] tracking-widest text-emerald-400/40 uppercase">
          {currentSectionIndex + 1} / {sectionIds.length}
        </p>
      </div>

      {/* Lyra avatar companion — hidden on mobile */}
      <div className={cn('fixed z-40 hidden md:block group', POSITION_CLASSES[avatarPos])}>
        <LyraCompanion stage={currentSectionIndex} variant={avatar} size={avatarSize} />

        {/* Hover-reveal controls */}
        <div className="mt-1 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-sm px-2 py-1">
            {AVATAR_VARIANTS.map((v) => (
              <ChipButton
                key={v}
                active={avatar === v}
                onClick={() => setAvatarParam({ avatar: v })}
                title={v}
                aria-label={m.talk_avatar_switch_variant()}
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
                aria-label={m.talk_avatar_set_size()}
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

        <SectionContainer id="character-creation" className="relative">
          <SectionChrome sectionId="character-creation" />
          <CharacterCreationSection />
        </SectionContainer>

        <SectionContainer id="tutorial-zone" className="relative">
          <SectionChrome sectionId="tutorial-zone" />
          <TutorialZoneSection />
        </SectionContainer>

        <SectionContainer id="skill-tree" className="relative">
          <SectionChrome sectionId="skill-tree" />
          <SkillTreeSection />
        </SectionContainer>

        <SectionContainer id="abandoned-quest" className="relative">
          <SectionChrome sectionId="abandoned-quest" />
          <AbandonedQuestSection />
        </SectionContainer>

        <SectionContainer id="build-change" className="relative">
          <SectionChrome sectionId="build-change" />
          <BuildChangeSection />
        </SectionContainer>

        <SectionContainer id="grand-respec" className="relative">
          <SectionChrome sectionId="grand-respec" />
          <GrandRespecSection />
        </SectionContainer>

        <SectionContainer id="industrialization" className="relative">
          <SectionChrome sectionId="industrialization" />
          <IndustrializationSection />
        </SectionContainer>

        <SectionContainer id="patch-notes" className="relative">
          <SectionChrome sectionId="patch-notes" />
          <PatchNotesSection />
        </SectionContainer>

        <SectionContainer id="craft-system" className="relative">
          <SectionChrome sectionId="craft-system" />
          <CraftSystemSection />
        </SectionContainer>

        <SectionContainer id="awakening-night" className="relative bg-[#0a0005]">
          <SectionChrome sectionId="awakening-night" />
          <AwakeningNightSection />
        </SectionContainer>

        <SectionContainer id="guild-hall" className="relative">
          <SectionChrome sectionId="guild-hall" />
          <GuildHallSection />
        </SectionContainer>

        <SectionContainer id="quest-journal" className="relative">
          <SectionChrome sectionId="quest-journal" />
          <QuestJournalSection />
        </SectionContainer>

        <SectionContainer id="session-log" className="relative">
          <SectionChrome sectionId="session-log" />
          <SessionLogSection />
        </SectionContainer>

        <SectionContainer id="endgame" className="relative">
          <SectionChrome sectionId="endgame" />
          <EndgameSection />
        </SectionContainer>

        <SectionContainer id="character-sheet" className="relative">
          <SectionChrome sectionId="character-sheet" />
          <CharacterSheetSection />
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
