import { HttpStatus } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'

export function sendErrorResponse(
  response: FastifyReply,
  request: FastifyRequest,
  correlationId: string,
  statusCode: number,
  exception: { message: string; errorCode: string | number }
) {
  const message =
    statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
      ? 'An internal error occurred'
      : exception.message

  response.header('x-correlation-id', correlationId)
  response.status(statusCode).send({
    statusCode,
    timestamp: new Date().toISOString(),
    path: request.url,
    correlationId,
    message,
    errorCode: exception.errorCode,
  })
}
