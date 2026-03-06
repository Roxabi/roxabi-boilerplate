export type RpgZoneConfig = {
  zone: string
  xp: number
  color: string
}

export const rpgZones: Record<string, RpgZoneConfig> = {
  title: { zone: 'START_SCREEN', xp: 0, color: 'gold' },
  'simple-idea': { zone: 'CHARACTER_CREATION', xp: 500, color: 'gold' },
  'breaking-things': { zone: 'TUTORIAL_ZONE', xp: 1000, color: 'crimson' },
  'building-habits': { zone: 'SKILL_TREE', xp: 3500, color: 'emerald' },
  'the-brain': { zone: 'LOOT_DROP', xp: 5000, color: 'gold' },
  'the-messenger': { zone: 'SUMMON_SPELL', xp: 8000, color: 'emerald' },
  'letting-go': { zone: 'QUEST_LOG', xp: 12000, color: 'crimson' },
  'the-voice': { zone: 'CRAFTING_BENCH', xp: 15000, color: 'emerald' },
  'the-night': { zone: 'BOSS_ARENA', xp: 20000, color: 'crimson' },
  'finding-name': { zone: 'NAME_SELECTION', xp: 25000, color: 'gold' },
  'the-character': { zone: 'CHARACTER_UNLOCK', xp: 30000, color: 'gold' },
  'the-ecosystem': { zone: 'GUILD_HALL', xp: 35000, color: 'emerald' },
  'the-numbers': { zone: 'SESSION_LOG', xp: 40000, color: 'gold' },
  'character-sheet': { zone: 'CHARACTER_SHEET', xp: 45000, color: 'gold' },
  'the-lesson': { zone: 'ACHIEVEMENT', xp: 50000, color: 'gold' },
  'next-steps': { zone: 'SIDE_QUESTS', xp: 52000, color: 'emerald' },
  closing: { zone: 'SAVE_POINT', xp: 52000, color: 'gold' },
}

export const RPG_TOTAL_XP = 52000
// Sections that render RPG chrome UI — `awakening` is intentionally excluded (it has no RPG chrome)
export const RPG_CHROME_SECTIONS = Object.keys(rpgZones)
