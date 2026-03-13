import { ConfigService } from '@nestjs/config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted mock state — accessible in factory and tests
const mockStart = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockStop = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockCreateQueue = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockSend = vi.hoisted(() => vi.fn().mockResolvedValue('job-id-123'))
const mockWork = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockGetQueueStats = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ queued: 0, active: 0, completed: 5, failed: 1 })
)
const mockOn = vi.hoisted(() => vi.fn())

vi.mock('pg-boss', () => {
  class PgBoss {
    start = mockStart
    stop = mockStop
    createQueue = mockCreateQueue
    send = mockSend
    work = mockWork
    getQueueStats = mockGetQueueStats
    on = mockOn
  }
  return { PgBoss }
})

const { QueueService } = await import('../queue.service.js')

function makeConfigService(workerEnabled = true) {
  return {
    get: vi.fn((key: string, defaultVal?: unknown) => {
      if (key === 'DATABASE_URL') return 'postgres://localhost:5432/testdb'
      if (key === 'QUEUE_WORKER_ENABLED') return workerEnabled
      return defaultVal
    }),
  } as unknown as ConfigService
}

describe('QueueService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('onModuleInit', () => {
    it('calls boss.start() and boss.createQueue() for each registered queue', async () => {
      // Arrange
      const config = makeConfigService()
      const service = new QueueService(config)
      service.registerQueue({ name: 'email-send', retryLimit: 3 })
      service.registerQueue({ name: 'email-dlq' })

      // Act
      await service.onModuleInit()

      // Assert
      expect(mockStart).toHaveBeenCalledOnce()
      expect(mockCreateQueue).toHaveBeenCalledTimes(2)
      expect(mockCreateQueue).toHaveBeenCalledWith(
        'email-send',
        expect.objectContaining({ retryLimit: 3 })
      )
      expect(mockCreateQueue).toHaveBeenCalledWith('email-dlq', expect.any(Object))
    })

    it('calls boss.work() for each registered handler when QUEUE_WORKER_ENABLED=true', async () => {
      // Arrange
      const config = makeConfigService(true)
      const service = new QueueService(config)
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      service.registerHandler('email-send', handler1, { batchSize: 5 })
      service.registerHandler('email-dlq', handler2)

      // Act
      await service.onModuleInit()

      // Assert
      expect(mockWork).toHaveBeenCalledTimes(2)
      expect(mockWork).toHaveBeenCalledWith(
        'email-send',
        expect.objectContaining({ batchSize: 5 }),
        handler1
      )
      expect(mockWork).toHaveBeenCalledWith('email-dlq', expect.any(Object), handler2)
    })

    it('does NOT call boss.work() when QUEUE_WORKER_ENABLED=false', async () => {
      // Arrange
      const config = makeConfigService(false)
      const service = new QueueService(config)
      const handler = vi.fn()
      service.registerHandler('email-send', handler)

      // Act
      await service.onModuleInit()

      // Assert
      expect(mockWork).not.toHaveBeenCalled()
    })
  })

  describe('enqueue', () => {
    it('delegates to boss.send() and returns job ID', async () => {
      // Arrange
      const config = makeConfigService()
      const service = new QueueService(config)
      const jobData = { to: 'user@example.com', subject: 'Hello' }

      // Act
      const result = await service.enqueue('email-send', jobData)

      // Assert
      expect(mockSend).toHaveBeenCalledWith('email-send', jobData, {})
      expect(result).toBe('job-id-123')
    })

    it('passes send options when provided', async () => {
      // Arrange
      const config = makeConfigService()
      const service = new QueueService(config)
      const jobData = { to: 'user@example.com' }
      const opts = { priority: 1 }

      // Act
      await service.enqueue('email-send', jobData, opts)

      // Assert
      expect(mockSend).toHaveBeenCalledWith('email-send', jobData, opts)
    })
  })

  describe('registerQueue', () => {
    it('stores queue config so it is used during onModuleInit', async () => {
      // Arrange
      const config = makeConfigService()
      const service = new QueueService(config)
      const queueOptions = { name: 'my-queue', retryLimit: 5, retryBackoff: true }

      // Act
      service.registerQueue(queueOptions)
      await service.onModuleInit()

      // Assert
      expect(mockCreateQueue).toHaveBeenCalledWith(
        'my-queue',
        expect.objectContaining({ retryLimit: 5, retryBackoff: true })
      )
    })
  })

  describe('registerHandler', () => {
    it('stores handler so it is registered during onModuleInit', async () => {
      // Arrange
      const config = makeConfigService(true)
      const service = new QueueService(config)
      const handler = vi.fn()
      const opts = { batchSize: 10, pollingIntervalSeconds: 5 }

      // Act
      service.registerHandler('email-send', handler, opts)
      await service.onModuleInit()

      // Assert
      expect(mockWork).toHaveBeenCalledWith(
        'email-send',
        expect.objectContaining({ batchSize: 10, pollingIntervalSeconds: 5 }),
        handler
      )
    })
  })

  describe('getQueueStats', () => {
    it('delegates to boss.getQueueStats()', async () => {
      // Arrange
      const config = makeConfigService()
      const service = new QueueService(config)

      // Act
      const result = await service.getQueueStats('email-send')

      // Assert
      expect(mockGetQueueStats).toHaveBeenCalledWith('email-send')
      expect(result).toEqual({ queued: 0, active: 0, completed: 5, failed: 1 })
    })
  })

  describe('onApplicationShutdown', () => {
    it('calls boss.stop() with graceful: true and timeout: 30000', async () => {
      // Arrange
      const config = makeConfigService()
      const service = new QueueService(config)

      // Act
      await service.onApplicationShutdown()

      // Assert
      expect(mockStop).toHaveBeenCalledWith({ graceful: true, timeout: 30000 })
    })
  })
})
