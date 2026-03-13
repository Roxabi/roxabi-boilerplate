export const QUEUE_SERVICE = Symbol('QUEUE_SERVICE')

export type QueueJobData = Record<string, unknown>

export type QueueConfig = {
  connectionString: string
}

export type QueueRegistration = {
  name: string
  retryLimit?: number
  retryDelay?: number
  retryBackoff?: boolean
  deadLetter?: string
}

export type QueueStats = {
  queued: number
  active: number
  completed: number
  failed: number
}
