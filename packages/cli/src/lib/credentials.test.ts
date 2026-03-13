import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

const testHome = join(tmpdir(), `roxabi-cli-creds-${Date.now()}`)
const credDir = join(testHome, '.config', 'roxabi')
const credPath = join(credDir, 'credentials.json')

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os')
  return { ...actual, homedir: () => testHome }
})

const { clearCredentials, loadCredentials, saveCredentials } = await import('./credentials.js')

describe('credentials', () => {
  beforeAll(() => {
    mkdirSync(testHome, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(credPath)) rmSync(credPath)
    if (existsSync(credDir)) rmSync(credDir, { recursive: true })
  })

  afterAll(() => {
    rmSync(testHome, { recursive: true, force: true })
  })

  it('returns null when no credentials file exists', () => {
    expect(loadCredentials()).toBeNull()
  })

  it('saves and loads credentials', () => {
    const creds = { token: 'sk_live_test123', apiUrl: 'http://localhost:4000' }
    saveCredentials(creds)

    expect(existsSync(credPath)).toBe(true)
    const loaded = loadCredentials()
    expect(loaded).toEqual(creds)
  })

  it('creates parent directories when saving', () => {
    const creds = { token: 'sk_live_abc', apiUrl: 'http://api.example.com' }
    saveCredentials(creds)

    const raw = readFileSync(credPath, 'utf-8')
    expect(JSON.parse(raw)).toEqual(creds)
  })

  it('returns null for malformed JSON', () => {
    mkdirSync(credDir, { recursive: true })
    writeFileSync(credPath, 'not valid json')

    expect(loadCredentials()).toBeNull()
  })

  it('returns null when token is missing', () => {
    mkdirSync(credDir, { recursive: true })
    writeFileSync(credPath, JSON.stringify({ apiUrl: 'http://localhost:4000' }))

    expect(loadCredentials()).toBeNull()
  })

  it('returns null when apiUrl is missing', () => {
    mkdirSync(credDir, { recursive: true })
    writeFileSync(credPath, JSON.stringify({ token: 'sk_live_xxx' }))

    expect(loadCredentials()).toBeNull()
  })

  it('clearCredentials empties the file', () => {
    saveCredentials({ token: 'sk_live_clear', apiUrl: 'http://localhost:4000' })
    clearCredentials()

    const raw = readFileSync(credPath, 'utf-8')
    expect(raw).toBe('')
    expect(loadCredentials()).toBeNull()
  })

  it('clearCredentials is a no-op when no file exists', () => {
    clearCredentials()
  })
})
