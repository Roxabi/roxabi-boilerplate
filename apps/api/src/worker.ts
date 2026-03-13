import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { WorkerAppModule } from './workerApp.module.js'

const logger = new Logger('Worker')

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerAppModule)
  app.enableShutdownHooks()
  logger.log('Queue worker started')

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down...')
    await app.close()
    process.exit(0)
  })
}

bootstrap().catch((err) => {
  console.error('Worker failed to start:', err)
  process.exit(1)
})
