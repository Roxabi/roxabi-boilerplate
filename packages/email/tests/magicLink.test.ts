import { describe, expect, it } from 'vitest'
import { renderMagicLinkEmail } from '../src/index'

describe('renderMagicLinkEmail', () => {
  const url = 'https://app.roxabi.com/api/auth/magic-link/verify?token=abc123'

  it('should render branded HTML with CTA button in English', async () => {
    const result = await renderMagicLinkEmail(url, 'en')
    expect(result.html).toContain(url)
    expect(result.html).toContain('Sign in')
  })

  it('should render branded HTML with CTA button in French', async () => {
    const result = await renderMagicLinkEmail(url, 'fr')
    expect(result.html).toContain(url)
    expect(result.html).toContain('connecter')
  })

  it('should include a plain text version in English', async () => {
    const result = await renderMagicLinkEmail(url, 'en')
    expect(result.text).toContain(url)
  })

  it('should include a plain text version in French', async () => {
    const result = await renderMagicLinkEmail(url, 'fr')
    expect(result.text).toContain(url)
  })

  it('should include a localized subject line', async () => {
    const en = await renderMagicLinkEmail(url, 'en')
    const fr = await renderMagicLinkEmail(url, 'fr')
    expect(en.subject).toBeTruthy()
    expect(fr.subject).toBeTruthy()
    expect(en.subject).not.toBe(fr.subject)
  })

  it('should fall back to English for unsupported locale', async () => {
    const result = await renderMagicLinkEmail(url, 'de')
    expect(result.subject).toBe('Sign in')
    expect(result.html).toContain('Sign in')
  })

  it('should match HTML snapshot for English', async () => {
    const result = await renderMagicLinkEmail(url, 'en')
    expect(result.html).toMatchSnapshot()
  })

  it('should match HTML snapshot for French', async () => {
    const result = await renderMagicLinkEmail(url, 'fr')
    expect(result.html).toMatchSnapshot()
  })

  it('should match plain text snapshot for English', async () => {
    const result = await renderMagicLinkEmail(url, 'en')
    expect(result.text).toMatchSnapshot()
  })

  it('should match plain text snapshot for French', async () => {
    const result = await renderMagicLinkEmail(url, 'fr')
    expect(result.text).toMatchSnapshot()
  })
})
