import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export interface Credentials {
  token: string
  apiUrl: string
}

function getCredentialsPath(): string {
  return join(homedir(), '.config', 'roxabi', 'credentials.json')
}

export function loadCredentials(): Credentials | null {
  const path = getCredentialsPath()
  if (!existsSync(path)) return null
  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(raw) as Credentials
    if (!(parsed.token && parsed.apiUrl)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveCredentials(credentials: Credentials): void {
  const path = getCredentialsPath()
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  writeFileSync(path, `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 })
}

export function clearCredentials(): void {
  const path = getCredentialsPath()
  if (existsSync(path)) {
    unlinkSync(path)
  }
}
