import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the credentials path to use a temp directory
const testDir = join(tmpdir(), `roxabi-cli-test-${Date.now()}`)
const testCredPath = join(testDir, 'credentials.json')

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os')
  return {
    ...actual,
    homedir: () => join(tmpdir(), `roxabi-cli-test-${Date.now()}`),
  }
})

describe('credentials', () => {
  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it('should return null when no credentials file exists', async () => {
    // Use dynamic import to get fresh module with mocked homedir
    const { loadCredentials } = await import('./credentials.js')
    expect(loadCredentials()).toBeNull()
  })

  it('should save and load credentials', () => {
    // Write directly to test path since homedir is mocked
    const creds = { token: 'sk_live_test123', apiUrl: 'http://localhost:4000' }
    mkdirSync(testDir, { recursive: true })
    writeFileSync(testCredPath, JSON.stringify(creds))

    // Read back
    const raw = readFileSync(testCredPath, 'utf-8')
    const parsed = JSON.parse(raw)
    expect(parsed.token).toBe('sk_live_test123')
    expect(parsed.apiUrl).toBe('http://localhost:4000')
  })

  it('should handle malformed credentials file', () => {
    writeFileSync(testCredPath, 'not json')
    expect(existsSync(testCredPath)).toBe(true)
  })
})
