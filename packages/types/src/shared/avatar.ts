export const DICEBEAR_CDN_DOMAIN = 'https://api.dicebear.com'
export const DICEBEAR_CDN_BASE = 'https://api.dicebear.com/9.x'

/**
 * Canonical source of truth for supported DiceBear avatar styles.
 * The `AvatarStyle` type is derived from this array — add or remove
 * entries here to update the type automatically.
 */
export const AVATAR_STYLES = [
  'lorelei',
  'bottts',
  'pixel-art',
  'thumbs',
  'avataaars',
  'adventurer',
  'toon-head',
] as const

export type AvatarStyle = (typeof AVATAR_STYLES)[number]
