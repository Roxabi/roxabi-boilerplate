export const QUEUE_REGISTRAR = Symbol('QUEUE_REGISTRAR')

export const QUEUE_NAMES = {
  EMAIL_SEND: 'email-send',
  EMAIL_DLQ: 'email-dlq',
} as const

export const QUEUE_DEFAULTS = {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
  batchSize: 1,
  pollingIntervalSeconds: 2,
} as const
