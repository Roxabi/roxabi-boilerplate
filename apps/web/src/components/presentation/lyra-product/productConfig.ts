export type ProductPhaseColor = 'amber' | 'orange' | 'rose' | 'cyan'

export type ProductSectionConfig = {
  phase: string
  day: string
  color: ProductPhaseColor
}

export const productSections = {
  title: { phase: 'INTRO', day: 'D00', color: 'amber' },
  'wrong-bet': { phase: 'WRONG_BET', day: 'D01-05', color: 'rose' },
  'pivot-speed': { phase: 'PIVOT', day: 'D05', color: 'orange' },
  'kill-darlings': { phase: 'KILL_IT', day: 'D12', color: 'rose' },
  'shared-foundation': { phase: 'COMPOUND', day: 'D09-12', color: 'amber' },
  'knowledge-radar': { phase: 'RADAR', day: 'D22', color: 'cyan' },
  'telegram-anywhere': { phase: 'SHIP_IT', day: 'D22-24', color: 'orange' },
  'industrial-turn': { phase: 'PROCESS', day: 'D26-31', color: 'amber' },
  'patch-notes': { phase: 'CHANGELOG', day: 'D31', color: 'amber' },
  'the-day': { phase: 'EXPLOSION', day: 'D47', color: 'orange' },
  voice: { phase: 'NEW_MODE', day: 'D47', color: 'cyan' },
  'the-night': { phase: 'TURNING_PT', day: 'D50', color: 'rose' },
  'lyra-not-solene': { phase: 'IDENTITY', day: 'D50', color: 'amber' },
  'the-ecosystem': { phase: 'ECOSYSTEM', day: 'D47-54', color: 'cyan' },
  'the-numbers': { phase: 'METRICS', day: '—', color: 'amber' },
  'lyra-in-4-days': { phase: 'OUTCOME', day: 'D52-55', color: 'orange' },
  'the-lesson': { phase: 'LESSON', day: '—', color: 'amber' },
  closing: { phase: 'NEXT', day: '—', color: 'amber' },
} satisfies Record<string, ProductSectionConfig>

export const colorMap: Record<
  ProductPhaseColor,
  { text: string; border: string; bg: string; glow: string }
> = {
  amber: {
    text: 'text-amber-400',
    border: 'border-amber-400/30',
    bg: 'bg-amber-500/8',
    glow: 'rgba(245,158,11,0.15)',
  },
  orange: {
    text: 'text-orange-400',
    border: 'border-orange-400/30',
    bg: 'bg-orange-500/8',
    glow: 'rgba(249,115,22,0.15)',
  },
  rose: {
    text: 'text-rose-400',
    border: 'border-rose-400/30',
    bg: 'bg-rose-500/8',
    glow: 'rgba(244,63,94,0.15)',
  },
  cyan: {
    text: 'text-cyan-400',
    border: 'border-cyan-400/30',
    bg: 'bg-cyan-500/8',
    glow: 'rgba(34,211,238,0.15)',
  },
}

export type SectionId = keyof typeof productSections
// Preserves insertion order — ordering is load-bearing for section index tracking
export const PRODUCT_SECTION_IDS = Object.keys(productSections) as string[]
