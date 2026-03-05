import { cn } from '@repo/ui'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'
import { rpgZones } from './rpgConfig'

type RpgSectionChromeProps = {
  sectionId: string
}

export function RpgSectionChrome({ sectionId }: RpgSectionChromeProps) {
  const { isRpg } = useLyraMode()
  if (!isRpg) return null

  const zone = rpgZones[sectionId]
  if (!zone) return null

  const colorClass =
    {
      gold: 'text-[var(--rpg-gold)] border-[var(--rpg-gold)]/30',
      crimson: 'text-[var(--rpg-crimson)] border-[var(--rpg-crimson)]/30',
      emerald: 'text-[var(--rpg-emerald)] border-[var(--rpg-emerald)]/30',
    }[zone.color] ?? 'text-[var(--rpg-gold)]'

  return (
    <div className="absolute top-4 left-4 z-10 hidden md:flex items-center gap-3">
      <span className={cn('rpg-pixel text-[8px] tracking-wider', colorClass)}>
        {m.talk_ls_rpg_hud_zone()} {zone.zone}
      </span>
      {zone.xp > 0 && (
        <span className="rpg-pixel text-[7px] text-[var(--rpg-gold)]/60">
          +{zone.xp.toLocaleString()} XP
        </span>
      )}
    </div>
  )
}
