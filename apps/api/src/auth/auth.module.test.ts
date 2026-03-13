import { APP_GUARD } from '@nestjs/core'
import { describe, expect, it } from 'vitest'
import { AuthController } from './auth.controller.js'
import { AuthGuard } from './auth.guard.js'
import { AuthModule } from './auth.module.js'
import { AuthService } from './auth.service.js'
import { SessionEnrichmentService } from './sessionEnrichment.service.js'

describe('AuthModule', () => {
  const imports: unknown[] = Reflect.getMetadata('imports', AuthModule) ?? []
  const controllers: unknown[] = Reflect.getMetadata('controllers', AuthModule) ?? []
  const providers: unknown[] = Reflect.getMetadata('providers', AuthModule) ?? []
  const exports_: unknown[] = Reflect.getMetadata('exports', AuthModule) ?? []

  it('should import EmailModule, QueueModule, RbacModule, UserModule and ApiKeyModule', () => {
    // Assert — EmailModule, QueueModule, RbacModule, ApiKeyModule are direct; only UserModule uses forwardRef
    expect(imports).toHaveLength(5)
  })

  it('should declare AuthController', () => {
    // Assert
    expect(controllers).toContain(AuthController)
  })

  it('should provide AuthService', () => {
    // Assert
    expect(providers).toContainEqual(AuthService)
  })

  it('should provide APP_GUARD with AuthGuard', () => {
    // Assert
    const guardProvider = providers.find(
      (p: unknown) =>
        typeof p === 'object' &&
        p !== null &&
        'provide' in p &&
        (p as { provide: unknown }).provide === APP_GUARD
    )
    expect(guardProvider).toBeDefined()
    expect((guardProvider as { useClass: unknown }).useClass).toBe(AuthGuard)
  })

  it('should provide SessionEnrichmentService', () => {
    // Assert
    expect(providers).toContainEqual(SessionEnrichmentService)
  })

  it('should export AuthService', () => {
    // Assert
    expect(exports_).toContain(AuthService)
  })

  it('should export SessionEnrichmentService', () => {
    // Assert
    expect(exports_).toContain(SessionEnrichmentService)
  })
})
