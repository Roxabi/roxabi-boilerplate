import type { Job } from 'pg-boss'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EMAIL_SEND_FAILED,
  EmailSendFailedEvent,
} from '../../common/events/emailSendFailed.event.js'
import { EmailDlqHandler } from '../handlers/emailDlq.handler.js'

function makeJob(overrides?: { id?: string; to?: string; subject?: string }): Job<object> {
  return {
    id: overrides?.id ?? 'dlq-job-456',
    name: 'email-dlq',
    data: {
      to: overrides?.to ?? 'user@example.com',
      subject: overrides?.subject ?? 'Test Subject',
      html: '<p>Hello</p>',
    },
    priority: 0,
    state: 'failed',
    retrylimit: 3,
    retrycount: 3,
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

describe('EmailDlqHandler', () => {
  let handler: EmailDlqHandler
  let mockEventEmitter: { emit: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockEventEmitter = { emit: vi.fn() }
    handler = new EmailDlqHandler(mockEventEmitter as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('handle', () => {
    it('emits EMAIL_SEND_FAILED event for each job', async () => {
      // Arrange
      const jobs = [
        makeJob({ id: 'job-1', to: 'a@example.com', subject: 'Sub A' }),
        makeJob({ id: 'job-2', to: 'b@example.com', subject: 'Sub B' }),
      ]

      // Act
      await handler.handle(jobs)

      // Assert
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(2)
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        EMAIL_SEND_FAILED,
        expect.objectContaining({
          recipient: 'a@example.com',
          subject: 'Sub A',
          error: expect.any(Error),
        })
      )
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        EMAIL_SEND_FAILED,
        expect.objectContaining({
          recipient: 'b@example.com',
          subject: 'Sub B',
          error: expect.any(Error),
        })
      )
    })

    it('emits event with correct EMAIL_SEND_FAILED constant as event name', async () => {
      // Arrange
      const jobs = [makeJob()]

      // Act
      await handler.handle(jobs)

      // Assert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('email.send.failed', expect.any(Object))
    })

    it('emits event with "unknown" fallback when job data is missing to/subject', async () => {
      // Arrange
      const job = {
        ...makeJob(),
        data: {},
      } as unknown as Job<object>

      // Act
      await handler.handle([job])

      // Assert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        EMAIL_SEND_FAILED,
        expect.objectContaining({
          recipient: 'unknown',
          subject: 'unknown',
        })
      )
    })

    it('handles empty job list without emitting events', async () => {
      // Arrange
      const jobs: Job<object>[] = []

      // Act
      await handler.handle(jobs)

      // Assert
      expect(mockEventEmitter.emit).not.toHaveBeenCalled()
    })

    it('emits event with an Error containing job id and recipient info', async () => {
      // Arrange
      const jobs = [makeJob({ id: 'job-xyz', to: 'fail@example.com', subject: 'My Subject' })]

      // Act
      await handler.handle(jobs)

      // Assert
      const calls = mockEventEmitter.emit.mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const emittedEvent = calls[0]?.[1] as EmailSendFailedEvent
      expect(emittedEvent.error).toBeInstanceOf(Error)
      expect(emittedEvent.error.message).toContain('job-xyz')
      expect(emittedEvent.error.message).toContain('fail@example.com')
    })
  })
})
