import { envSchema, type ServerEnv } from './env.server.schema.js'

export { envSchema, type ServerEnv } from './env.server.schema.js'

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  throw new Error(
    `Server env validation failed:\n${parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`
  )
}

export const env: ServerEnv = parsed.data
