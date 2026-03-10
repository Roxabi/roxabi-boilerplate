export interface ErrorResponseBody {
  statusCode: number
  timestamp: string
  path: string | undefined
  correlationId: string
  message: string | string[]
  errorCode?: string
}

export function buildErrorResponse(params: {
  statusCode: number
  path: string | undefined
  correlationId: string
  message: string | string[]
  errorCode?: string
}): ErrorResponseBody {
  return {
    statusCode: params.statusCode,
    timestamp: new Date().toISOString(),
    path: params.path,
    correlationId: params.correlationId,
    message: params.message,
    ...(params.errorCode !== undefined && { errorCode: params.errorCode }),
  }
}
