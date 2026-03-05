import { PresentationNav } from '@repo/ui'
import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useRef } from 'react'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import { BreakingThingsSection } from '@/components/presentation/lyra-story/BreakingThingsSection'
import { BuildingHabitsSection } from '@/components/presentation/lyra-story/BuildingHabitsSection'
import { CharacterSheetSection } from '@/components/presentation/lyra-story/CharacterSheetSection'
import { ClosingSection } from '@/components/presentation/lyra-story/ClosingSection'
import { FindingTheNameSection } from '@/components/presentation/lyra-story/FindingTheNameSection'
import { LettingGoSection } from '@/components/presentation/lyra-story/LettingGoSection'
import { NextStepsSection } from '@/components/presentation/lyra-story/NextStepsSection'
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

export const Route = createLazyFileRoute('/talks/lyra-story')({
  component: LyraStoryPresentation,
})

export function LyraStoryPresentation() {
  const navigate = useNavigate()
  const handleEscape = useCallback(() => navigate({ to: '/talks' }), [navigate])
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const sections = [
    { id: 'title', label: m.talk_ls_nav_title() },
    { id: 'simple-idea', label: m.talk_ls_nav_simple_idea() },
    { id: 'breaking-things', label: m.talk_ls_nav_breaking() },
    { id: 'building-habits', label: m.talk_ls_nav_habits() },
    { id: 'the-brain', label: m.talk_ls_nav_brain() },
    { id: 'the-messenger', label: m.talk_ls_nav_messenger() },
    { id: 'letting-go', label: m.talk_ls_nav_letting_go() },
    { id: 'the-voice', label: m.talk_ls_nav_voice() },
    { id: 'the-night', label: m.talk_ls_nav_night() },
    { id: 'finding-name', label: m.talk_ls_nav_name() },
    { id: 'the-character', label: m.talk_ls_nav_character() },
    { id: 'the-ecosystem', label: m.talk_ls_nav_ecosystem() },
    { id: 'the-numbers', label: m.talk_ls_nav_numbers() },
    { id: 'character-sheet', label: m.talk_ls_nav_sheet() },
    { id: 'the-lesson', label: m.talk_ls_nav_lesson() },
    { id: 'next-steps', label: m.talk_ls_nav_next() },
    { id: 'closing', label: m.talk_ls_nav_closing() },
  ]

  return (
    <div data-presentation className="relative bg-background text-foreground">
      {/* Roxabi wordmark */}
      <div className="fixed left-6 top-6 z-50">
        <Link
          to="/"
          className="text-sm font-bold tracking-wider text-muted-foreground/70 hover:text-foreground transition-colors uppercase"
        >
          Roxabi
        </Link>
      </div>

      {/* Locale switcher + Theme toggle */}
      <div className="fixed right-6 top-6 z-50 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
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
        <SectionContainer id="title">
          <TitleSection />
        </SectionContainer>

        <SectionContainer id="simple-idea">
          <SimpleIdeaSection />
        </SectionContainer>

        <SectionContainer id="breaking-things">
          <BreakingThingsSection />
        </SectionContainer>

        <SectionContainer id="building-habits">
          <BuildingHabitsSection />
        </SectionContainer>

        <SectionContainer id="the-brain">
          <TheBrainSection />
        </SectionContainer>

        <SectionContainer id="the-messenger">
          <TheMessengerSection />
        </SectionContainer>

        <SectionContainer id="letting-go">
          <LettingGoSection />
        </SectionContainer>

        <SectionContainer id="the-voice">
          <TheVoiceSection />
        </SectionContainer>

        <SectionContainer
          id="the-night"
          className="bg-gradient-to-b from-[#0a0a1a] via-[#0d1025] to-[#0a0a1a] dark:from-[#050510] dark:via-[#080818] dark:to-[#050510] text-gray-100"
        >
          <TheNightSection />
        </SectionContainer>

        <SectionContainer id="finding-name">
          <FindingTheNameSection />
        </SectionContainer>

        <SectionContainer id="the-character">
          <TheCharacterSection />
        </SectionContainer>

        <SectionContainer id="the-ecosystem">
          <TheEcosystemSection />
        </SectionContainer>

        <SectionContainer id="the-numbers">
          <TheNumbersSection />
        </SectionContainer>

        <SectionContainer id="character-sheet">
          <CharacterSheetSection />
        </SectionContainer>

        <SectionContainer id="the-lesson">
          <TheLessonSection />
        </SectionContainer>

        <SectionContainer id="next-steps">
          <NextStepsSection />
        </SectionContainer>

        <SectionContainer id="closing">
          <ClosingSection />
        </SectionContainer>
      </div>
    </div>
  )
}
