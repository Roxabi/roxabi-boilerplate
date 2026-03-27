import { z } from 'zod'

const httpsUrl = (name: string) =>
  z
    .string()
    .url()
    .refine(
      (v) => v.startsWith('https://') || v.startsWith('http://localhost'),
      `${name} must use https (http://localhost allowed in dev)`
    )
    .optional()

export const clientEnvSchema = z.object({
  VITE_APP_NAME: z
    .string()
    .max(64)
    .regex(/^[\w\s\-.]+$/)
    .optional(),
  VITE_GITHUB_REPO_URL: z.string().url().optional(),
  VITE_TALKS_URL: httpsUrl('VITE_TALKS_URL'),
  VITE_DOCS_URL: httpsUrl('VITE_DOCS_URL'),
})

export type ClientEnv = z.infer<typeof clientEnvSchema>

export const clientEnv: ClientEnv = clientEnvSchema.parse({
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
  VITE_GITHUB_REPO_URL: import.meta.env.VITE_GITHUB_REPO_URL,
  VITE_TALKS_URL: import.meta.env.VITE_TALKS_URL,
  VITE_DOCS_URL: import.meta.env.VITE_DOCS_URL,
})
