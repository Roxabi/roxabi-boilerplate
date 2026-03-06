export type DevZoneColor = 'gold' | 'emerald' | 'crimson' | 'blue'

export type DevZoneConfig = {
  zone: string
  xp: number
  color: DevZoneColor
}

export const devZones: Record<string, DevZoneConfig> = {
  title: { zone: 'START_SCREEN', xp: 0, color: 'gold' },
  'character-creation': { zone: 'CHARACTER_CREATION', xp: 500, color: 'gold' },
  'tutorial-zone': { zone: 'TUTORIAL_ZONE', xp: 1000, color: 'crimson' },
  'skill-tree': { zone: 'SKILL_TREE', xp: 3500, color: 'emerald' },
  'abandoned-quest': { zone: 'QUEST_LOG', xp: 4500, color: 'crimson' },
  'build-change': { zone: 'LOOT_DROP', xp: 8000, color: 'emerald' },
  'grand-respec': { zone: 'GRAND_RESPEC', xp: 12000, color: 'crimson' },
  industrialization: { zone: 'FACTORY', xp: 20000, color: 'emerald' },
  'patch-notes': { zone: 'CHANGELOG', xp: 22000, color: 'gold' },
  'craft-system': { zone: 'CRAFT_BENCH', xp: 30000, color: 'emerald' },
  'awakening-night': { zone: 'BOSS_ARENA', xp: 50000, color: 'crimson' },
  'guild-hall': { zone: 'GUILD_HALL', xp: 52000, color: 'emerald' },
  'quest-journal': { zone: 'LORE_ARCHIVE', xp: 52000, color: 'blue' },
  'session-log': { zone: 'LEADERBOARD', xp: 52000, color: 'blue' },
  endgame: { zone: 'ENDGAME', xp: 52000, color: 'emerald' },
  'character-sheet': { zone: 'CHARACTER_SHEET', xp: 52000, color: 'gold' },
  'the-lesson': { zone: 'ACHIEVEMENT', xp: 52000, color: 'gold' },
  closing: { zone: 'SAVE_POINT', xp: 52000, color: 'gold' },
}

export const DEV_TOTAL_XP = 52000

export type SectionId = keyof typeof devZones

export const DEV_SECTION_IDS = Object.keys(devZones) as string[]

export const colorMap: Record<
  DevZoneColor,
  { text: string; border: string; bg: string; glow: string }
> = {
  gold: {
    text: 'text-amber-400',
    border: 'border-amber-400/30',
    bg: 'bg-amber-500/8',
    glow: 'rgba(245,158,11,0.15)',
  },
  emerald: {
    text: 'text-emerald-400',
    border: 'border-emerald-400/30',
    bg: 'bg-emerald-500/8',
    glow: 'rgba(16,185,129,0.15)',
  },
  crimson: {
    text: 'text-red-400',
    border: 'border-red-400/30',
    bg: 'bg-red-500/8',
    glow: 'rgba(239,68,68,0.15)',
  },
  blue: {
    text: 'text-blue-400',
    border: 'border-blue-400/30',
    bg: 'bg-blue-500/8',
    glow: 'rgba(59,130,246,0.15)',
  },
}
