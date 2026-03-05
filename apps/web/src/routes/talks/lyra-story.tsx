import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  mode: z.enum(['story', 'mmorpg']).optional().default('story'),
})

export const Route = createFileRoute('/talks/lyra-story')({
  validateSearch: searchSchema,
})
