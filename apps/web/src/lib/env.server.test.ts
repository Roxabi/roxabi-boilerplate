import { afterEach, describe, expect, it, vi } from 'vitest'
import { envSchema } from './env.server.schema'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('envSchema', () => {
  describe('default values', () => {
    it('should require API_URL (no default — throws when not provided)', () => {
      // Arrange
      const input = {}

      // Act & Assert
      expect(() => envSchema.parse(input)).toThrow()
    })

    it('should default NODE_ENV to "development" when not provided', () => {
      // Arrange
      const input = { API_URL: 'http://localhost:4000', APP_URL: 'http://localhost:3000' }

      // Act
      const result = envSchema.parse(input)

      // Assert
      expect(result.NODE_ENV).toBe('development')
    })
  })

  describe('API_URL', () => {
    it('should accept a valid HTTPS URL', () => {
      // Arrange
      const input = { API_URL: 'https://api.example.com', APP_URL: 'http://localhost:3000' }

      // Act
      const result = envSchema.parse(input)

      // Assert
      expect(result.API_URL).toBe('https://api.example.com')
    })

    it('should accept a valid HTTP URL with port', () => {
      // Arrange
      const input = { API_URL: 'http://localhost:4000', APP_URL: 'http://localhost:3000' }

      // Act
      const result = envSchema.parse(input)

      // Assert
      expect(result.API_URL).toBe('http://localhost:4000')
    })

    it('should reject an invalid URL string', () => {
      // Arrange
      const input = { API_URL: 'not-a-url', APP_URL: 'http://localhost:3000' }

      // Act & Assert
      expect(() => envSchema.parse(input)).toThrow()
    })

    it('should reject a bare domain without protocol', () => {
      // Arrange
      const input = { API_URL: 'api.example.com', APP_URL: 'http://localhost:3000' }

      // Act & Assert
      expect(() => envSchema.parse(input)).toThrow()
    })
  })

  describe('APP_URL', () => {
    it('should accept a valid URL', () => {
      // Arrange
      const input = { API_URL: 'http://localhost:4000', APP_URL: 'https://app.example.com' }

      // Act
      const result = envSchema.parse(input)

      // Assert
      expect(result.APP_URL).toBe('https://app.example.com')
    })

    it('should be required (throws when not provided)', () => {
      // Arrange
      const input = { API_URL: 'http://localhost:4000' }

      // Act & Assert
      expect(() => envSchema.parse(input)).toThrow()
    })

    it('should reject an invalid URL', () => {
      // Arrange
      const input = { API_URL: 'http://localhost:4000', APP_URL: 'not-valid' }

      // Act & Assert
      expect(() => envSchema.parse(input)).toThrow()
    })
  })

  describe('NODE_ENV', () => {
    it('should accept "development"', () => {
      // Arrange
      const input = {
        API_URL: 'http://localhost:4000',
        NODE_ENV: 'development',
        APP_URL: 'http://localhost:3000',
      }

      // Act
      const result = envSchema.parse(input)

      // Assert
      expect(result.NODE_ENV).toBe('development')
    })

    it('should accept "production"', () => {
      // Arrange
      const input = {
        API_URL: 'http://localhost:4000',
        NODE_ENV: 'production',
        APP_URL: 'http://localhost:3000',
      }

      // Act
      const result = envSchema.parse(input)

      // Assert
      expect(result.NODE_ENV).toBe('production')
    })

    it('should accept "test"', () => {
      // Arrange
      const input = {
        API_URL: 'http://localhost:4000',
        NODE_ENV: 'test',
        APP_URL: 'http://localhost:3000',
      }

      // Act
      const result = envSchema.parse(input)

      // Assert
      expect(result.NODE_ENV).toBe('test')
    })

    it('should reject an invalid NODE_ENV value', () => {
      // Arrange
      const input = {
        API_URL: 'http://localhost:4000',
        NODE_ENV: 'staging',
        APP_URL: 'http://localhost:3000',
      }

      // Act & Assert
      expect(() => envSchema.parse(input)).toThrow()
    })
  })

  describe('VERCEL_ENV', () => {
    it('should accept "production"', () => {
      // Arrange
      const input = {
        API_URL: 'http://localhost:4000',
        VERCEL_ENV: 'production',
        APP_URL: 'http://localhost:3000',
      }

      // Act
      const result = envSchema.parse(input)

      // Assert
      expect(result.VERCEL_ENV).toBe('production')
    })

    it('should accept "preview"', () => {
      // Arrange
      const input = {
        API_URL: 'http://localhost:4000',
        VERCEL_ENV: 'preview',
        APP_URL: 'http://localhost:3000',
      }

      // Act
      const result = envSchema.parse(input)

      // Assert
      expect(result.VERCEL_ENV).toBe('preview')
    })

    it('should accept "development"', () => {
      // Arrange
      const input = {
        API_URL: 'http://localhost:4000',
        VERCEL_ENV: 'development',
        APP_URL: 'http://localhost:3000',
      }

      // Act
      const result = envSchema.parse(input)

      // Assert
      expect(result.VERCEL_ENV).toBe('development')
    })

    it('should be undefined when not provided (optional)', () => {
      // Arrange
      const input = { API_URL: 'http://localhost:4000', APP_URL: 'http://localhost:3000' }

      // Act
      const result = envSchema.parse(input)

      // Assert
      expect(result.VERCEL_ENV).toBeUndefined()
    })

    it('should reject an invalid VERCEL_ENV value', () => {
      // Arrange
      const input = {
        API_URL: 'http://localhost:4000',
        VERCEL_ENV: 'staging',
        APP_URL: 'http://localhost:3000',
      }

      // Act & Assert
      expect(() => envSchema.parse(input)).toThrow()
    })
  })
})

describe('env.server module-level validation', () => {
  async function importEnvServer(envOverrides: Record<string, string>) {
    vi.resetModules()
    for (const [key, value] of Object.entries(envOverrides)) {
      vi.stubEnv(key, value)
    }
    return import('./env.server')
  }

  it('should succeed in development with explicit API_URL', async () => {
    // Arrange — API_URL is now required; no default exists
    const envVars = {
      NODE_ENV: 'development',
      API_URL: 'http://localhost:4000',
      APP_URL: 'http://localhost:3000',
    }

    // Act
    const mod = await importEnvServer(envVars)

    // Assert
    expect(mod.env.API_URL).toBe('http://localhost:4000')
    expect(mod.env.NODE_ENV).toBe('development')
  })

  it('should succeed with a valid API_URL in production', async () => {
    // Arrange
    const envVars = {
      NODE_ENV: 'production',
      API_URL: 'https://api.production.example.com',
      APP_URL: 'https://app.production.example.com',
    }

    // Act
    const mod = await importEnvServer(envVars)

    // Assert
    expect(mod.env.API_URL).toBe('https://api.production.example.com')
    expect(mod.env.NODE_ENV).toBe('production')
  })

  it('should throw when API_URL is not set in production', async () => {
    // Arrange — schema validation fails first (API_URL required)
    const envVars = { NODE_ENV: 'production' }

    // Act & Assert
    await expect(importEnvServer(envVars)).rejects.toThrow('Server env validation failed')
  })

  it('should throw when API_URL is not set in test environment', async () => {
    // Arrange — schema validation fails first (API_URL required)
    const envVars = { NODE_ENV: 'test' }

    // Act & Assert
    await expect(importEnvServer(envVars)).rejects.toThrow('Server env validation failed')
  })

  it('should throw on schema validation failure with invalid API_URL', async () => {
    // Arrange
    const envVars = { API_URL: 'not-a-url', APP_URL: 'http://localhost:3000' }

    // Act & Assert
    await expect(importEnvServer(envVars)).rejects.toThrow('Server env validation failed')
  })

  it('should throw on schema validation failure with invalid NODE_ENV', async () => {
    // Arrange
    const envVars = {
      API_URL: 'http://localhost:4000',
      NODE_ENV: 'invalid',
    }

    // Act & Assert
    await expect(importEnvServer(envVars)).rejects.toThrow('Server env validation failed')
  })
})
