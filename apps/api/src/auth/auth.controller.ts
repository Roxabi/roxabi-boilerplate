import { All, Controller, Get, Req, Res } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AuthService } from './auth.service.js'
import { AllowAnonymous } from './decorators/allowAnonymous.js'
import { Session } from './decorators/session.decorator.js'
import { toFetchHeaders } from './fastifyHeaders.js'
import type { AuthenticatedSession } from './types.js'

@Controller()
@ApiExcludeController()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('api/session')
  getSession(@Session() session: AuthenticatedSession) {
    return session
  }

  @Get('api/auth/providers')
  @AllowAnonymous()
  getEnabledProviders() {
    return this.authService.enabledProviders
  }

  @All('api/auth/*')
  @AllowAnonymous()
  async handleAuth(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const url = new URL(req.url, `${req.protocol}://${req.headers.host}`)
    const headers = toFetchHeaders(req)

    const body =
      req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined

    const fetchRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
    })

    const response = await this.authService.handler(fetchRequest)

    reply.status(response.status)
    for (const [key, value] of response.headers.entries()) {
      reply.header(key, value)
    }
    const text = await response.text()
    return reply.send(text)
  }
}
