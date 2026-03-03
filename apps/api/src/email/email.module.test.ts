import { describe, expect, it, vi } from 'vitest'
import { EmailModule } from './email.module.js'
import { EMAIL_PROVIDER } from './email.provider.js'
import { NodemailerEmailProvider } from './nodemailer.provider.js'
import { ResendEmailProvider } from './resend.provider.js'

// Note: DI compile-time smoke tests (Test.createTestingModule) are not feasible here because
// Vitest uses esbuild which does not emit TypeScript decorator parameter type metadata
// (design:paramtypes). The metadata assertions below verify provider registration and export
// wiring, which is the declarative part of the module. DI resolution is covered by provider
// unit tests (email.provider.test.ts, nodemailer.provider.test.ts).

function createMockConfig(values: Record<string, string | undefined>) {
  return {
    get: vi.fn((key: string, defaultValue?: string) => values[key] ?? defaultValue),
  }
}

describe('EmailModule', () => {
  const providers: unknown[] = Reflect.getMetadata('providers', EmailModule) ?? []
  const exports_: unknown[] = Reflect.getMetadata('exports', EmailModule) ?? []

  it('should provide EMAIL_PROVIDER via useFactory', () => {
    // Assert — provider registration uses useFactory (env-based provider selection)
    const emailProvider = providers.find(
      (p: unknown) =>
        typeof p === 'object' &&
        p !== null &&
        'provide' in p &&
        (p as { provide: unknown }).provide === EMAIL_PROVIDER
    )
    expect(emailProvider).toBeDefined()
    expect(typeof (emailProvider as { useFactory: unknown }).useFactory).toBe('function')
  })

  it('should export EMAIL_PROVIDER token', () => {
    // Assert
    expect(exports_).toContain(EMAIL_PROVIDER)
  })

  describe('useFactory — provider selection', () => {
    function getFactory() {
      const emailProvider = providers.find(
        (p: unknown) =>
          typeof p === 'object' &&
          p !== null &&
          'provide' in p &&
          (p as { provide: unknown }).provide === EMAIL_PROVIDER
      ) as { useFactory: (config: ReturnType<typeof createMockConfig>) => unknown }
      return emailProvider.useFactory
    }

    it('should return ResendEmailProvider when RESEND_API_KEY is set', () => {
      // Arrange
      const config = createMockConfig({ RESEND_API_KEY: 're_test_123' })

      // Act
      const provider = getFactory()(config as never)

      // Assert
      expect(provider).toBeInstanceOf(ResendEmailProvider)
    })

    it('should return NodemailerEmailProvider when SMTP_HOST is set (no RESEND_API_KEY)', () => {
      // Arrange
      const config = createMockConfig({ SMTP_HOST: 'localhost' })

      // Act
      const provider = getFactory()(config as never)

      // Assert
      expect(provider).toBeInstanceOf(NodemailerEmailProvider)
    })

    it('should return ResendEmailProvider (console fallback) when neither env var is set', () => {
      // Arrange
      const config = createMockConfig({})

      // Act
      const provider = getFactory()(config as never)

      // Assert — fallback to ResendEmailProvider (console-log mode)
      expect(provider).toBeInstanceOf(ResendEmailProvider)
    })
  })
})
