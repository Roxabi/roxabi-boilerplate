import { describe, expect, it, vi } from 'vitest'
import { validate } from './env.validation.js'

describe('env validation', () => {
  it('should pass with valid config', () => {
    const result = validate({
      NODE_ENV: 'development',
      PORT: 4000,
      CORS_ORIGIN: 'http://localhost:3000',
      LOG_LEVEL: 'debug',
    })

    expect(result.NODE_ENV).toBe('development')
    expect(result.PORT).toBe(4000)
    expect(result.CORS_ORIGIN).toBe('http://localhost:3000')
    expect(result.LOG_LEVEL).toBe('debug')
  })

  it('should apply defaults for missing optional values', () => {
    const result = validate({})

    expect(result.NODE_ENV).toBe('development')
    expect(result.PORT).toBe(4000)
    expect(result.CORS_ORIGIN).toBe('http://localhost:3000')
    expect(result.LOG_LEVEL).toBe('warn')
    expect(result.DATABASE_URL).toBeUndefined()
    expect(result.APP_URL).toBeUndefined()
  })

  it('should accept all valid NODE_ENV values', () => {
    for (const env of ['development', 'production', 'test']) {
      const result = validate({
        NODE_ENV: env,
        BETTER_AUTH_SECRET: 'a-safe-secret-for-testing-purposes',
        ...(env !== 'development' && {
          RESEND_API_KEY: 're_test_123',
          CRON_SECRET: 'test-cron-secret-minimum-32-chars!',
        }),
        ...(env === 'production' && {
          KV_REST_API_URL: 'https://redis.upstash.io',
          KV_REST_API_TOKEN: 'test-token',
        }),
      })
      expect(result.NODE_ENV).toBe(env)
    }
  })

  it('should throw on invalid NODE_ENV', () => {
    expect(() => validate({ NODE_ENV: 'staging' })).toThrow()
  })

  it('should throw on invalid PORT type', () => {
    expect(() => validate({ PORT: 'abc' })).toThrow()
  })

  it('should accept DATABASE_URL when provided', () => {
    const result = validate({ DATABASE_URL: 'postgres://localhost:5432/test' })
    expect(result.DATABASE_URL).toBe('postgres://localhost:5432/test')
  })

  it('should accept a numeric PORT', () => {
    const result = validate({ PORT: 8080 })
    expect(result.PORT).toBe(8080)
  })

  it('should coerce a string PORT to number', () => {
    const result = validate({ PORT: '9090' })
    expect(result.PORT).toBe(9090)
  })

  describe('APP_URL validation', () => {
    it('should accept a valid APP_URL', () => {
      const result = validate({ APP_URL: 'https://app.example.com' })
      expect(result.APP_URL).toBe('https://app.example.com')
    })

    it('should throw on invalid APP_URL', () => {
      expect(() => validate({ APP_URL: 'not-a-url' })).toThrow()
    })

    it('should allow APP_URL to be omitted', () => {
      const result = validate({})
      expect(result.APP_URL).toBeUndefined()
    })
  })

  describe('BETTER_AUTH_URL validation', () => {
    it('should default to http://localhost:4000', () => {
      const result = validate({})
      expect(result.BETTER_AUTH_URL).toBe('http://localhost:4000')
    })

    it('should throw on invalid BETTER_AUTH_URL', () => {
      expect(() => validate({ BETTER_AUTH_URL: 'not-a-url' })).toThrow()
    })
  })

  describe('BETTER_AUTH_SECRET non-development guard', () => {
    it('should throw when using default secret in production', () => {
      expect(() =>
        validate({
          NODE_ENV: 'production',
          BETTER_AUTH_SECRET: 'dev-secret-do-not-use-in-production',
          KV_REST_API_URL: 'https://redis.upstash.io',
          KV_REST_API_TOKEN: 'test-token',
        })
      ).toThrow('BETTER_AUTH_SECRET must be set to a secure value in non-development environments')
    })

    it('should throw when using placeholder secret in production', () => {
      expect(() =>
        validate({
          NODE_ENV: 'production',
          BETTER_AUTH_SECRET: 'change-me-to-a-random-32-char-string',
          KV_REST_API_URL: 'https://redis.upstash.io',
          KV_REST_API_TOKEN: 'test-token',
        })
      ).toThrow('BETTER_AUTH_SECRET must be set to a secure value in non-development environments')
    })

    it('should allow default secret in development', () => {
      const result = validate({ NODE_ENV: 'development' })
      expect(result.BETTER_AUTH_SECRET).toBe('dev-secret-do-not-use-in-production')
    })

    it('should throw when using default secret in test environment', () => {
      expect(() => validate({ NODE_ENV: 'test' })).toThrow(
        'BETTER_AUTH_SECRET must be set to a secure value in non-development environments'
      )
    })

    it('should allow explicit secret in test environment', () => {
      const result = validate({
        NODE_ENV: 'test',
        BETTER_AUTH_SECRET: 'test-secret-minimum-32-characters-long',
        RESEND_API_KEY: 're_test_123',
        CRON_SECRET: 'test-cron-secret-minimum-32-chars!',
      })
      expect(result.BETTER_AUTH_SECRET).toBe('test-secret-minimum-32-characters-long')
    })

    it('should allow custom secret in production', () => {
      const result = validate({
        NODE_ENV: 'production',
        BETTER_AUTH_SECRET: 'a-real-secret-that-is-safe-for-prod',
        RESEND_API_KEY: 're_test_123',
        CRON_SECRET: 'test-cron-secret-minimum-32-chars!',
        KV_REST_API_URL: 'https://redis.upstash.io',
        KV_REST_API_TOKEN: 'test-token',
      })
      expect(result.BETTER_AUTH_SECRET).toBe('a-real-secret-that-is-safe-for-prod')
    })
  })

  describe('VERCEL_ENV validation', () => {
    it('should accept valid VERCEL_ENV values', () => {
      for (const env of ['production', 'preview', 'development']) {
        const result = validate({
          VERCEL_ENV: env,
          BETTER_AUTH_SECRET: 'test-secret-minimum-32-characters-long',
          RESEND_API_KEY: 're_test_123',
          ...(env === 'production' && {
            KV_REST_API_URL: 'https://redis.upstash.io',
            KV_REST_API_TOKEN: 'test-token',
          }),
        })
        expect(result.VERCEL_ENV).toBe(env)
      }
    })

    it('should reject invalid VERCEL_ENV values', () => {
      expect(() => validate({ VERCEL_ENV: 'staging' })).toThrow()
    })

    it('should allow VERCEL_ENV to be omitted', () => {
      const result = validate({})
      expect(result.VERCEL_ENV).toBeUndefined()
    })
  })

  describe('VERCEL_ENV secondary guard', () => {
    it('should throw when using default secret with VERCEL_ENV set', () => {
      expect(() =>
        validate({
          NODE_ENV: 'development',
          VERCEL_ENV: 'preview',
          BETTER_AUTH_SECRET: 'dev-secret-do-not-use-in-production',
        })
      ).toThrow('BETTER_AUTH_SECRET must be set to a secure value on Vercel deployments')
    })

    it('should throw when NODE_ENV=production even if VERCEL_ENV=development', () => {
      expect(() =>
        validate({
          NODE_ENV: 'production',
          VERCEL_ENV: 'development',
          BETTER_AUTH_SECRET: 'dev-secret-do-not-use-in-production',
          KV_REST_API_URL: 'https://redis.upstash.io',
          KV_REST_API_TOKEN: 'test-token',
        })
      ).toThrow('BETTER_AUTH_SECRET must be set to a secure value in non-development environments')
    })

    it('should allow explicit secret with VERCEL_ENV set', () => {
      const result = validate({
        NODE_ENV: 'development',
        VERCEL_ENV: 'preview',
        BETTER_AUTH_SECRET: 'test-secret-minimum-32-characters-long',
        RESEND_API_KEY: 're_test_123',
      })
      expect(result.BETTER_AUTH_SECRET).toBe('test-secret-minimum-32-characters-long')
    })
  })

  describe('CRON_SECRET non-development guard', () => {
    it('should throw when CRON_SECRET is missing in production', () => {
      expect(() =>
        validate({
          NODE_ENV: 'production',
          BETTER_AUTH_SECRET: 'a-real-secret-that-is-safe-for-prod',
          RESEND_API_KEY: 're_test_123',
          KV_REST_API_URL: 'https://redis.upstash.io',
          KV_REST_API_TOKEN: 'test-token',
        })
      ).toThrow('CRON_SECRET is required in non-development environments')
    })

    it('should throw when CRON_SECRET is missing in test', () => {
      expect(() =>
        validate({
          NODE_ENV: 'test',
          BETTER_AUTH_SECRET: 'test-secret-minimum-32-characters-long',
          RESEND_API_KEY: 're_test_123',
        })
      ).toThrow('CRON_SECRET is required in non-development environments')
    })

    it('should allow missing CRON_SECRET in development', () => {
      const result = validate({ NODE_ENV: 'development' })
      expect(result.CRON_SECRET).toBeUndefined()
    })

    it('should accept CRON_SECRET when provided', () => {
      const result = validate({
        NODE_ENV: 'test',
        BETTER_AUTH_SECRET: 'test-secret-minimum-32-characters-long',
        RESEND_API_KEY: 're_test_123',
        CRON_SECRET: 'my-cron-secret-minimum-32-characters!',
      })
      expect(result.CRON_SECRET).toBe('my-cron-secret-minimum-32-characters!')
    })
  })

  describe('Upstash Redis production guard', () => {
    it('should throw when KV_REST_API_URL is missing in production with rate limiting enabled', () => {
      expect(() =>
        validate({
          NODE_ENV: 'production',
          BETTER_AUTH_SECRET: 'a-real-secret-that-is-safe-for-prod',
          RESEND_API_KEY: 're_test_123',
          CRON_SECRET: 'test-cron-secret-minimum-32-chars!',
          RATE_LIMIT_ENABLED: true,
        })
      ).toThrow('KV_REST_API_URL and KV_REST_API_TOKEN are required in production')
    })

    it('should throw when KV_REST_API_TOKEN is missing in production with rate limiting enabled', () => {
      expect(() =>
        validate({
          NODE_ENV: 'production',
          BETTER_AUTH_SECRET: 'a-real-secret-that-is-safe-for-prod',
          RESEND_API_KEY: 're_test_123',
          CRON_SECRET: 'test-cron-secret-minimum-32-chars!',
          RATE_LIMIT_ENABLED: true,
          KV_REST_API_URL: 'https://redis.upstash.io',
        })
      ).toThrow('KV_REST_API_URL and KV_REST_API_TOKEN are required in production')
    })

    it('should allow missing Upstash vars in production when rate limiting is disabled', () => {
      const result = validate({
        NODE_ENV: 'production',
        BETTER_AUTH_SECRET: 'a-real-secret-that-is-safe-for-prod',
        RESEND_API_KEY: 're_test_123',
        CRON_SECRET: 'test-cron-secret-minimum-32-chars!',
        RATE_LIMIT_ENABLED: false,
      })
      expect(result.KV_REST_API_URL).toBeUndefined()
      expect(result.KV_REST_API_TOKEN).toBeUndefined()
    })

    it('should log security error when rate limiting is disabled in production', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      validate({
        NODE_ENV: 'production',
        BETTER_AUTH_SECRET: 'a-real-secret-that-is-safe-for-prod',
        RESEND_API_KEY: 're_test_123',
        CRON_SECRET: 'test-cron-secret-minimum-32-chars!',
        RATE_LIMIT_ENABLED: false,
      })
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY] RATE_LIMIT_ENABLED=false in production')
      )
      errorSpy.mockRestore()
    })

    it('should allow missing KV_REST_API_URL in development', () => {
      const result = validate({ NODE_ENV: 'development' })
      expect(result.KV_REST_API_URL).toBeUndefined()
    })

    it('should accept KV_REST_API_URL when provided', () => {
      const result = validate({ KV_REST_API_URL: 'https://redis.upstash.io' })
      expect(result.KV_REST_API_URL).toBe('https://redis.upstash.io')
    })
  })

  describe('rate limiting env vars', () => {
    it('should apply rate limiting defaults', () => {
      const result = validate({})
      expect(result.RATE_LIMIT_ENABLED).toBe(true)
      expect(result.RATE_LIMIT_GLOBAL_TTL).toBe(60_000)
      expect(result.RATE_LIMIT_GLOBAL_LIMIT).toBe(60)
      expect(result.RATE_LIMIT_AUTH_TTL).toBe(60_000)
      expect(result.RATE_LIMIT_AUTH_LIMIT).toBe(5)
      expect(result.RATE_LIMIT_AUTH_BLOCK_DURATION).toBe(300_000)
      expect(result.SWAGGER_ENABLED).toBeUndefined()
      expect(result.RATE_LIMIT_API_TTL).toBe(60_000)
      expect(result.RATE_LIMIT_API_LIMIT).toBe(100)
    })

    it('should accept custom rate limit values', () => {
      const result = validate({
        RATE_LIMIT_GLOBAL_LIMIT: '120',
        RATE_LIMIT_AUTH_LIMIT: '10',
      })
      expect(result.RATE_LIMIT_GLOBAL_LIMIT).toBe(120)
      expect(result.RATE_LIMIT_AUTH_LIMIT).toBe(10)
    })
  })

  describe('RESEND_API_KEY non-development guard', () => {
    it('should throw when RESEND_API_KEY is missing in test environment', () => {
      expect(() =>
        validate({
          NODE_ENV: 'test',
          BETTER_AUTH_SECRET: 'test-secret-minimum-32-characters-long',
        })
      ).toThrow('RESEND_API_KEY must be set in non-development environments')
    })

    it('should throw non-development error (not Vercel error) when both NODE_ENV=test and VERCEL_ENV=preview', () => {
      expect(() =>
        validate({
          NODE_ENV: 'test',
          VERCEL_ENV: 'preview',
          BETTER_AUTH_SECRET: 'test-secret-minimum-32-characters-long',
        })
      ).toThrow('RESEND_API_KEY must be set in non-development environments')
    })

    it('should throw when RESEND_API_KEY is missing in production', () => {
      expect(() =>
        validate({
          NODE_ENV: 'production',
          BETTER_AUTH_SECRET: 'a-real-secret-that-is-safe-for-prod',
          KV_REST_API_URL: 'https://redis.upstash.io',
          KV_REST_API_TOKEN: 'test-token',
        })
      ).toThrow('RESEND_API_KEY must be set in non-development environments')
    })

    it('should throw when RESEND_API_KEY is missing on Vercel deployments', () => {
      expect(() =>
        validate({
          NODE_ENV: 'development',
          VERCEL_ENV: 'preview',
          BETTER_AUTH_SECRET: 'test-secret-minimum-32-characters-long',
        })
      ).toThrow('RESEND_API_KEY must be set on Vercel deployments')
    })

    it('should accept RESEND_API_KEY when provided', () => {
      const result = validate({
        NODE_ENV: 'test',
        BETTER_AUTH_SECRET: 'test-secret-minimum-32-characters-long',
        RESEND_API_KEY: 're_test_123',
        CRON_SECRET: 'test-cron-secret-minimum-32-chars!',
      })
      expect(result.RESEND_API_KEY).toBe('re_test_123')
    })
  })

  describe('SWAGGER_ENABLED validation', () => {
    it('should coerce string "true" to boolean true', () => {
      const result = validate({ SWAGGER_ENABLED: 'true' })
      expect(result.SWAGGER_ENABLED).toBe(true)
    })

    it('should coerce string "false" to boolean false', () => {
      const result = validate({ SWAGGER_ENABLED: 'false' })
      expect(result.SWAGGER_ENABLED).toBe(false)
    })

    it('should accept boolean true directly', () => {
      const result = validate({ SWAGGER_ENABLED: true })
      expect(result.SWAGGER_ENABLED).toBe(true)
    })

    it('should be undefined when omitted', () => {
      const result = validate({})
      expect(result.SWAGGER_ENABLED).toBeUndefined()
    })
  })
})
