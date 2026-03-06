export const AVATAR_VARIANTS = [
  'quantum',
  'constellation',
  'rpg-canvas',
  'tamagotchi',
  'silhouette',
  'blob',
  'pokemon',
] as const

export const AVATAR_POSITIONS = ['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const

export type AvatarVariant = (typeof AVATAR_VARIANTS)[number]
export type AvatarPosition = (typeof AVATAR_POSITIONS)[number]
