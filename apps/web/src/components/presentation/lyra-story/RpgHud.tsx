import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'

type RpgHudProps = {
  currentSectionIndex: number
  totalSections: number
}

export function RpgHud({ currentSectionIndex, totalSections }: RpgHudProps) {
  const { isRpg } = useLyraMode()
  if (!isRpg) return null

  const progress = Math.round((currentSectionIndex / (totalSections - 1)) * 100)

  return (
    <div className="fixed inset-x-0 top-0 z-40 pointer-events-none hidden md:block">
      {/* Top bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 pt-16 pb-2">
        {/* Character name + level */}
        <div className="flex items-center gap-3">
          <span className="rpg-pixel text-[10px] text-[var(--rpg-gold)]">
            {m.talk_ls_rpg_hud_name()}
          </span>
          <span className="rpg-pixel text-[8px] text-[var(--rpg-gold)]/70">
            {m.talk_ls_rpg_hud_level()} {currentSectionIndex + 1}
          </span>
        </div>

        {/* XP bar */}
        <div className="flex items-center gap-2">
          <span className="rpg-pixel text-[8px] text-[var(--rpg-gold)]/70">
            {m.talk_ls_rpg_hud_xp()}
          </span>
          <div className="h-2 w-32 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--rpg-gold)] to-orange-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom-left HP/Mana */}
      <div className="fixed bottom-6 left-6 z-40 hidden md:flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="rpg-pixel text-[7px] text-[var(--rpg-crimson)] w-8">
            {m.talk_ls_rpg_hud_hp()}
          </span>
          <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-[var(--rpg-crimson)] to-red-400" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rpg-pixel text-[7px] text-blue-400 w-8">{m.talk_ls_rpg_hud_mana()}</span>
          <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
