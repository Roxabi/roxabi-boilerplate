import fastifyCookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module.js'
import { DEFAULT_LOG_LEVEL } from './config/env.validation.js'
import { parseCorsOrigins } from './cors.js'
import { registerRateLimitHeadersHook } from './throttler/index.js'

async function configureSecurityHeaders(
  app: NestFastifyApplication,
  swaggerEnabled: boolean
): Promise<void> {
  // Swagger requires unsafe-inline and unpkg.com for its bundled UI assets.
  // Tighten CSP to self-only when Swagger is disabled (production default).
  const scriptSrc = swaggerEnabled ? ["'self'", "'unsafe-inline'", 'https://unpkg.com'] : ["'self'"]
  const styleSrc = swaggerEnabled ? ["'self'", "'unsafe-inline'", 'https://unpkg.com'] : ["'self'"]

  // Security headers (must be registered before routes)
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc,
        styleSrc,
        imgSrc: ["'self'", 'data:', 'https://api.dicebear.com'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginEmbedderPolicy: false, // disabled to allow cross-origin resources (fonts, images)
  })

  // Cookie parsing and serialization (required for reply.setCookie())
  await app.register(fastifyCookie)

  // Permissions-Policy (not included in helmet v8)
  app
    .getHttpAdapter()
    .getInstance()
    .addHook(
      'onSend',
      (
        _request: unknown,
        reply: { header: (k: string, v: string) => void },
        _payload: unknown,
        done: () => void
      ) => {
        reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=()')
        done()
      }
    )
}

function configureCors(
  app: NestFastifyApplication,
  configService: ConfigService,
  logger: Logger,
  nodeEnv: string
): void {
  const isProduction = nodeEnv === 'production'
  const rawOrigins = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000')
  const corsResult = parseCorsOrigins(rawOrigins, isProduction)

  if (corsResult.warning) {
    logger.warn(corsResult.warning)
  }
  app.enableCors({ origin: corsResult.origins, credentials: true })
}

function configureSwagger(
  app: NestFastifyApplication,
  logger: Logger,
  swaggerEnabled: boolean
): void {
  if (swaggerEnabled) {
    const appName = process.env.APP_NAME ?? 'App'
    const config = new DocumentBuilder()
      .setTitle(appName + ' API')
      .setDescription(appName + ' SaaS Backend API')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document, {
      customCssUrl: 'https://unpkg.com/swagger-ui-dist@5.31.0/swagger-ui.css',
      customJs: [
        'https://unpkg.com/swagger-ui-dist@5.31.0/swagger-ui-bundle.js',
        'https://unpkg.com/swagger-ui-dist@5.31.0/swagger-ui-standalone-preset.js',
      ],
    })
    logger.log('Swagger UI enabled at /api/docs')
  } else {
    logger.log('Swagger UI disabled (set SWAGGER_ENABLED=true to enable)')
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: {
        level: process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL,
      },
      bodyLimit: 1_048_576, // 1 MiB — explicit limit
      trustProxy: 1, // trust single proxy hop (Vercel) for correct client IP from x-forwarded-for
    })
  )

  app.enableShutdownHooks()

  const configService = app.get(ConfigService)
  const logger = new Logger('Bootstrap')
  const nodeEnv = configService.get<string>('NODE_ENV', 'development')
  // ConfigService.get<boolean>() does not coerce strings at runtime; the boolean generic
  // is type-level only. SWAGGER_ENABLED is pre-validated as a native boolean by the Zod
  // schema in env.validation.ts before ConfigService is populated.
  const swaggerEnabled = configService.get<boolean>('SWAGGER_ENABLED', nodeEnv === 'development')

  await configureSecurityHeaders(app, swaggerEnabled)
  registerRateLimitHeadersHook(app)

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  configureCors(app, configService, logger, nodeEnv)
  configureSwagger(app, logger, swaggerEnabled)

  // API_PORT for local dev; fall back to Vercel-injected PORT at runtime
  const port = parseInt(process.env.PORT || '', 10) || configService.get<number>('API_PORT', 4000)
  await app.listen(port, '0.0.0.0')
  logger.log(`Application is running on: http://localhost:${port}`)
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err)
  process.exit(1)
})
