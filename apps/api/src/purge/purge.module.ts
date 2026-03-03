import { Module } from '@nestjs/common'
import { UserModule } from '../user/user.module.js'
import { PurgeController } from './purge.controller.js'
import { PurgeService } from './purge.service.js'

@Module({
  imports: [UserModule],
  controllers: [PurgeController],
  providers: [PurgeService],
})
export class PurgeModule {}
