import { describe, expect, it } from 'vitest'
import { clientEnvSchema } from './env.shared'

describe('clientEnvSchema', () => {
  describe('default values', () => {
    it('should leave VITE_GITHUB_REPO_URL undefined when not provided', () => {
      // Arrange
      const input = { VITE_APP_URL: 'http://localhost:3000' }

      // Act
      const result = clientEnvSchema.parse(input)

      // Assert
      expect(result.VITE_GITHUB_REPO_URL).toBeUndefined()
    })
  })

  describe('VITE_GITHUB_REPO_URL', () => {
    it('should accept a valid HTTPS URL', () => {
      // Arrange
      const input = {
        VITE_GITHUB_REPO_URL: 'https://github.com/example/repo',
        VITE_APP_URL: 'http://localhost:3000',
      }

      // Act
      const result = clientEnvSchema.parse(input)

      // Assert
      expect(result.VITE_GITHUB_REPO_URL).toBe('https://github.com/example/repo')
    })

    it('should accept a valid HTTP URL', () => {
      // Arrange
      const input = {
        VITE_GITHUB_REPO_URL: 'http://localhost:3000',
        VITE_APP_URL: 'http://localhost:3000',
      }

      // Act
      const result = clientEnvSchema.parse(input)

      // Assert
      expect(result.VITE_GITHUB_REPO_URL).toBe('http://localhost:3000')
    })

    it('should reject an invalid URL string', () => {
      // Arrange
      const input = { VITE_GITHUB_REPO_URL: 'not-a-url', VITE_APP_URL: 'http://localhost:3000' }

      // Act & Assert
      expect(() => clientEnvSchema.parse(input)).toThrow()
    })

    it('should reject a bare domain without protocol', () => {
      // Arrange
      const input = {
        VITE_GITHUB_REPO_URL: 'github.com/example/repo',
        VITE_APP_URL: 'http://localhost:3000',
      }

      // Act & Assert
      expect(() => clientEnvSchema.parse(input)).toThrow()
    })

    it('should accept undefined (optional field)', () => {
      // Arrange
      const input = { VITE_GITHUB_REPO_URL: undefined, VITE_APP_URL: 'http://localhost:3000' }

      // Act
      const result = clientEnvSchema.parse(input)

      // Assert
      expect(result.VITE_GITHUB_REPO_URL).toBeUndefined()
    })
  })

  describe('full valid parse', () => {
    it('should parse a complete valid input with all fields', () => {
      // Arrange
      const input = {
        VITE_APP_URL: 'http://localhost:3000',
        VITE_GITHUB_REPO_URL: 'https://github.com/roxabi/boilerplate',
      }

      // Act
      const result = clientEnvSchema.parse(input)

      // Assert
      expect(result).toEqual({
        VITE_APP_URL: 'http://localhost:3000',
        VITE_GITHUB_REPO_URL: 'https://github.com/roxabi/boilerplate',
      })
    })

    it('should strip unknown keys from input', () => {
      // Arrange
      const input = {
        VITE_APP_URL: 'http://localhost:3000',
        UNKNOWN_KEY: 'should be stripped',
      }

      // Act
      const result = clientEnvSchema.parse(input)

      // Assert
      expect(result).not.toHaveProperty('UNKNOWN_KEY')
    })
  })
})
