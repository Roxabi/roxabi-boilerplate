import { cn } from '@repo/ui'
import { colorMap, devZones, type SectionId } from './devConfig'

type SectionChromeProps = {
  sectionId: SectionId
}

export function SectionChrome({ sectionId }: SectionChromeProps) {
  const zone = devZones[sectionId]
  if (!zone) return null

  const colors = colorMap[zone.color]

  return (
    <div className="absolute top-4 left-4 z-10 hidden md:flex items-center gap-3">
      <span className={cn('font-mono text-[8px] tracking-widest uppercase', colors.text)}>
        {zone.zone}
      </span>
      {zone.xp > 0 && (
        <span className="font-mono text-[7px] text-amber-400/50">
          +{zone.xp.toLocaleString()} XP
        </span>
      )}
    </div>
  )
}
