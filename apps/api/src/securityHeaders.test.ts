import helmet from '@fastify/helmet'
import { Controller, Get, Module } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

@Controller()
class TestController {
  @Get('test')
  getTest() {
    return { ok: true }
  }
}

@Module({ controllers: [TestController] })
class TestModule {}

describe('Security Headers', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), {
      logger: false,
    })

    await app.register(helmet, {
      global: true,
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"] } },
      hsts: { maxAge: 31536000, includeSubDomains: true },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginEmbedderPolicy: false,
    })

    // Permissions-Policy (not included in helmet v8)
    app
      .getHttpAdapter()
      .getInstance()
      .addHook(
        'onSend',
        (
          _request: unknown,
          reply: { header: (k: string, v: string) => void },
          _payload: unknown,
          done: () => void
        ) => {
          reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=()')
          done()
        }
      )

    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should include strict-transport-security header', async () => {
    const response = await app.inject({ method: 'GET', url: '/test' })

    expect(response.headers['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains'
    )
  })

  it('should include x-content-type-options header', async () => {
    const response = await app.inject({ method: 'GET', url: '/test' })

    expect(response.headers['x-content-type-options']).toBe('nosniff')
  })

  it('should include x-frame-options header', async () => {
    const response = await app.inject({ method: 'GET', url: '/test' })

    expect(response.headers['x-frame-options']).toBe('DENY')
  })

  it('should include referrer-policy header', async () => {
    const response = await app.inject({ method: 'GET', url: '/test' })

    expect(response.headers['referrer-policy']).toBe('no-referrer')
  })

  it('should include content-security-policy header', async () => {
    const response = await app.inject({ method: 'GET', url: '/test' })

    expect(response.headers['content-security-policy']).toContain("default-src 'none'")
  })

  it('should include permissions-policy header', async () => {
    const response = await app.inject({ method: 'GET', url: '/test' })

    expect(response.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()')
  })

  it('should not include x-powered-by header', async () => {
    const response = await app.inject({ method: 'GET', url: '/test' })

    expect(response.headers['x-powered-by']).toBeUndefined()
  })
})
