import { type ClientEnv, clientEnvSchema } from './env.shared.schema'

export { type ClientEnv, clientEnvSchema } from './env.shared.schema'

export const clientEnv: ClientEnv = clientEnvSchema.parse({
  VITE_APP_URL: import.meta.env.VITE_APP_URL,
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
  VITE_GITHUB_REPO_URL: import.meta.env.VITE_GITHUB_REPO_URL,
  VITE_TALKS_URL: import.meta.env.VITE_TALKS_URL,
  VITE_DOCS_URL: import.meta.env.VITE_DOCS_URL,
})
