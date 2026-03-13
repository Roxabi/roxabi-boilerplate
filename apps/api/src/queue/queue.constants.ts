export const QUEUE_NAMES = {
  EMAIL_SEND: 'email-send',
  EMAIL_DLQ: 'email-dlq',
} as const

export const QUEUE_DEFAULTS = {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
  batchSize: 5,
  pollingIntervalSeconds: 2,
} as const
