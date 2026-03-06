import { z } from 'zod'

export const envSchema = z.object({
  API_URL: z.string().url().default('http://localhost:4000'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  APP_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  VERCEL_AUTOMATION_BYPASS_SECRET: z.string().optional(),
})

export type ServerEnv = z.infer<typeof envSchema>
