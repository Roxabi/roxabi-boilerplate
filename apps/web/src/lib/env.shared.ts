import { z } from 'zod'

export const clientEnvSchema = z.object({
  VITE_GITHUB_REPO_URL: z.string().url().optional(),
  VITE_TALKS_URL: z.string().url().optional(),
  VITE_DOCS_URL: z.string().url().optional(),
})

export type ClientEnv = z.infer<typeof clientEnvSchema>

export const clientEnv: ClientEnv = clientEnvSchema.parse({
  VITE_GITHUB_REPO_URL: import.meta.env.VITE_GITHUB_REPO_URL,
  VITE_TALKS_URL: import.meta.env.VITE_TALKS_URL,
  VITE_DOCS_URL: import.meta.env.VITE_DOCS_URL,
})
