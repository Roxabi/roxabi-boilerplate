import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

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

export const AVATAR_SIZES = [48, 80, 200, 400] as const

export type AvatarVariant = (typeof AVATAR_VARIANTS)[number]
export type AvatarPosition = (typeof AVATAR_POSITIONS)[number]

const searchSchema = z.object({
  avatar: z.enum(AVATAR_VARIANTS).optional().default('constellation'),
  avatarSize: z.coerce
    .number()
    .refine((n) => (AVATAR_SIZES as readonly number[]).includes(n))
    .optional()
    .default(400),
  avatarPos: z.enum(AVATAR_POSITIONS).optional().default('bottom-left'),
})

export const Route = createFileRoute('/talks/lyra-dev')({
  validateSearch: searchSchema,
})
