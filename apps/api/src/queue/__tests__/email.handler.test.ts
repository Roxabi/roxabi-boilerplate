import type { Job } from 'pg-boss'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EmailProvider } from '../../email/email.provider.js'
import { type EmailJobPayload, EmailQueueHandler } from '../handlers/email.handler.js'

function makeJob(overrides?: Partial<EmailJobPayload>): Job<object> {
  return {
    id: 'job-abc-123',
    name: 'email-send',
    data: {
      to: 'user@example.com',
      subject: 'Test Subject',
      html: '<p>Hello</p>',
      text: 'Hello',
      ...overrides,
    },
    priority: 0,
    state: 'active',
    retrylimit: 3,
    retrycount: 0,
    retrydelay: 30,
    retrybackoff: true,
    startafter: new Date(),
    singletonkey: null,
    expirein: { hours: 1 },
    createdon: new Date(),
    startedon: new Date(),
    completedon: null,
    keepuntil: new Date(),
    on_complete: false,
    output: null,
    policy: 'standard',
    deadletter: null,
    archivedon: null,
  } as unknown as Job<object>
}

describe('EmailQueueHandler', () => {
  let handler: EmailQueueHandler
  let mockEmailProvider: { send: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockEmailProvider = { send: vi.fn().mockResolvedValue(undefined) }
    handler = new EmailQueueHandler(mockEmailProvider as unknown as EmailProvider)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('handle', () => {
    it('calls emailProvider.send() for each job', async () => {
      // Arrange
      const jobs = [
        makeJob({ to: 'a@example.com', subject: 'Sub A', html: '<p>A</p>' }),
        makeJob({ to: 'b@example.com', subject: 'Sub B', html: '<p>B</p>' }),
      ]

      // Act
      await handler.handle(jobs)

      // Assert
      expect(mockEmailProvider.send).toHaveBeenCalledTimes(2)
      expect(mockEmailProvider.send).toHaveBeenCalledWith({
        to: 'a@example.com',
        subject: 'Sub A',
        html: '<p>A</p>',
        text: 'Hello',
      })
      expect(mockEmailProvider.send).toHaveBeenCalledWith({
        to: 'b@example.com',
        subject: 'Sub B',
        html: '<p>B</p>',
        text: 'Hello',
      })
    })

    it('throws when emailProvider.send() throws so pg-boss can retry', async () => {
      // Arrange
      const sendError = new Error('SMTP connection refused')
      mockEmailProvider.send.mockRejectedValueOnce(sendError)
      const jobs = [makeJob()]

      // Act & Assert
      await expect(handler.handle(jobs)).rejects.toThrow('SMTP connection refused')
    })

    it('stops processing subsequent jobs after first failure', async () => {
      // Arrange
      mockEmailProvider.send.mockRejectedValueOnce(new Error('Send failed'))
      const jobs = [makeJob({ to: 'a@example.com' }), makeJob({ to: 'b@example.com' })]

      // Act & Assert
      await expect(handler.handle(jobs)).rejects.toThrow()
      expect(mockEmailProvider.send).toHaveBeenCalledTimes(1)
    })

    it('handles empty job list without calling emailProvider', async () => {
      // Arrange
      const jobs: Job<object>[] = []

      // Act
      await handler.handle(jobs)

      // Assert
      expect(mockEmailProvider.send).not.toHaveBeenCalled()
    })

    it('passes text as undefined when not provided in job data', async () => {
      // Arrange
      const job = makeJob({
        to: 'user@example.com',
        subject: 'Sub',
        html: '<p>Hi</p>',
        text: undefined,
      })
      const jobs = [job]

      // Act
      await handler.handle(jobs)

      // Assert
      expect(mockEmailProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'user@example.com', text: undefined })
      )
    })
  })
})
