import { Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Job, QueueResult, SendOptions, WorkOptions } from 'pg-boss'
import { PgBoss } from 'pg-boss'
import type { QueueRegistration } from './queue.provider.js'

type HandlerRegistration = {
  name: string
  handler: (jobs: Job[]) => Promise<void>
  opts?: WorkOptions
}

@Injectable()
export class QueueService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(QueueService.name)
  private boss: PgBoss
  private readonly queues: QueueRegistration[] = []
  private readonly handlers: HandlerRegistration[] = []
  private workerEnabled: boolean

  constructor(private readonly config: ConfigService) {
    const databaseUrl = this.config.get<string>('DATABASE_URL')
    this.workerEnabled = this.config.get<boolean>('QUEUE_WORKER_ENABLED', true)

    this.boss = new PgBoss({ connectionString: databaseUrl })

    this.boss.on('error', (err: unknown) => {
      this.logger.error('pg-boss error', err instanceof Error ? err.stack : String(err))
    })

    this.boss.on('warning', (msg: unknown) => {
      this.logger.warn(`pg-boss warning: ${String(msg)}`)
    })
  }

  async onModuleInit(): Promise<void> {
    await this.boss.start()
    this.logger.log('pg-boss started')

    for (const queue of this.queues) {
      await this.boss.createQueue(queue.name, {
        retryLimit: queue.retryLimit,
        retryDelay: queue.retryDelay,
        retryBackoff: queue.retryBackoff,
        deadLetter: queue.deadLetter,
      })
      this.logger.log(`Queue registered: ${queue.name}`)
    }

    if (this.workerEnabled) {
      for (const { name, handler, opts } of this.handlers) {
        await this.boss.work(name, { ...opts }, handler)
        this.logger.log(`Worker registered for queue: ${name}`)
      }
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.boss.stop({ graceful: true, timeout: 30000 })
    this.logger.log('pg-boss stopped')
  }

  async enqueue(
    name: string,
    data: Record<string, unknown>,
    opts?: SendOptions
  ): Promise<string | null> {
    return this.boss.send(name, data, opts ?? {})
  }

  registerQueue(options: QueueRegistration): void {
    this.queues.push(options)
  }

  registerHandler(name: string, handler: (jobs: Job[]) => Promise<void>, opts?: WorkOptions): void {
    this.handlers.push({ name, handler, opts })
  }

  async getQueueStats(name: string): Promise<QueueResult | null> {
    return this.boss.getQueueStats(name)
  }
}
