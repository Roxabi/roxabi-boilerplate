import { useSearch } from '@tanstack/react-router'
import { createContext, type ReactNode, useContext } from 'react'

type LyraMode = 'story' | 'mmorpg'
type LyraModeContextValue = { mode: LyraMode; isRpg: boolean }

const LyraModeContext = createContext<LyraModeContextValue>({ mode: 'story', isRpg: false })

export function LyraModeProvider({ children }: { children: ReactNode }) {
  const { mode } = useSearch({ from: '/talks/lyra-story' })
  const value: LyraModeContextValue = { mode: mode ?? 'story', isRpg: mode === 'mmorpg' }
  return <LyraModeContext value={value}>{children}</LyraModeContext>
}

export function useLyraMode() {
  return useContext(LyraModeContext)
}
