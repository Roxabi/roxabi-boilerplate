import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  AVATAR_POSITIONS,
  AVATAR_VARIANTS,
} from '@/components/presentation/lyra-story/lyra.constants'

const AVATAR_SIZES = [48, 80, 200, 400] as const

export const searchSchema = z.object({
  mode: z.enum(['story', 'mmorpg']).optional().default('story'),
  avatar: z.enum(AVATAR_VARIANTS).optional().default('constellation'),
  avatarSize: z.coerce
    .number()
    .refine((n) => (AVATAR_SIZES as readonly number[]).includes(n))
    .optional()
    .default(400),
  avatarPos: z.enum(AVATAR_POSITIONS).optional().default('bottom-left'),
})

export const Route = createFileRoute('/talks/lyra-story')({
  validateSearch: searchSchema,
})

export { AVATAR_VARIANTS, AVATAR_SIZES, AVATAR_POSITIONS }
export type {
  AvatarPosition,
  AvatarVariant,
} from '@/components/presentation/lyra-story/lyra.constants'
