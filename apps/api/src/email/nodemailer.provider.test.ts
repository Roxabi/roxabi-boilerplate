import { Logger } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EmailSendException } from './emailSend.exception.js'
import { NodemailerEmailProvider } from './nodemailer.provider.js'

const mockSendMail = vi.fn()

vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: mockSendMail }) },
}))

function createMockConfig(values: Record<string, string | number | undefined>) {
  return {
    get: vi.fn((key: string, defaultValue?: string | number) => values[key] ?? defaultValue),
  }
}

describe('NodemailerEmailProvider', () => {
  beforeEach(() => {
    mockSendMail.mockClear()
  })

  describe('constructor', () => {
    it('should read SMTP_HOST, SMTP_PORT, SMTP_SECURE and EMAIL_FROM from config', () => {
      // Arrange
      const config = createMockConfig({ SMTP_HOST: 'mailpit.local', SMTP_PORT: 1025 })

      // Act
      new NodemailerEmailProvider(config as never)

      // Assert
      expect(config.get).toHaveBeenCalledWith('SMTP_HOST', 'localhost')
      expect(config.get).toHaveBeenCalledWith('SMTP_PORT', 1025)
      expect(config.get).toHaveBeenCalledWith('SMTP_SECURE', false)
      expect(config.get).toHaveBeenCalledWith('EMAIL_FROM', 'dev@localhost')
    })
  })

  describe('send()', () => {
    it('should call sendMail with from: EMAIL_FROM config and all provided params', async () => {
      // Arrange
      mockSendMail.mockResolvedValueOnce({})
      const config = createMockConfig({ EMAIL_FROM: 'noreply@example.com' })
      const provider = new NodemailerEmailProvider(config as never)

      // Act
      await provider.send({
        to: 'user@example.com',
        subject: 'Welcome',
        html: '<h1>Welcome!</h1>',
        text: 'Welcome!',
      })

      // Assert
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'user@example.com',
        subject: 'Welcome',
        html: '<h1>Welcome!</h1>',
        text: 'Welcome!',
      })
    })

    it('should default from to dev@localhost when EMAIL_FROM is not set', async () => {
      // Arrange
      mockSendMail.mockResolvedValueOnce({})
      const config = createMockConfig({})
      const provider = new NodemailerEmailProvider(config as never)

      // Act
      await provider.send({
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>Hello</p>',
      })

      // Assert
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'dev@localhost',
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>Hello</p>',
      })
    })

    it('should call sendMail without text when text is not provided', async () => {
      // Arrange
      mockSendMail.mockResolvedValueOnce({})
      const config = createMockConfig({})
      const provider = new NodemailerEmailProvider(config as never)

      // Act
      await provider.send({
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>Hello</p>',
      })

      // Assert
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'dev@localhost',
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>Hello</p>',
      })
    })

    it('should throw EmailSendException when sendMail rejects', async () => {
      // Arrange
      const transportError = new Error('Connection refused')
      mockSendMail.mockRejectedValueOnce(transportError)
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
      const config = createMockConfig({})
      const provider = new NodemailerEmailProvider(config as never)

      // Act & Assert
      await expect(
        provider.send({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
        })
      ).rejects.toThrow(EmailSendException)
    })

    it('should log error with redacted recipient and subject when sendMail rejects', async () => {
      // Arrange
      const transportError = new Error('SMTP timeout')
      mockSendMail.mockRejectedValueOnce(transportError)
      const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
      const config = createMockConfig({})
      const provider = new NodemailerEmailProvider(config as never)

      // Act
      await provider
        .send({
          to: 'user@example.com',
          subject: 'Verify email',
          html: '<p>Click here</p>',
        })
        .catch(() => {})

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to send email to us***@example.com (subject: "Verify email"): SMTP timeout',
        transportError.stack
      )

      errorSpy.mockRestore()
    })
  })
})
