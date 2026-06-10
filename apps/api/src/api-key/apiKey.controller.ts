import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'
import { Permissions } from '../auth/decorators/permissions.decorator.js'
import { Session } from '../auth/decorators/session.decorator.js'
import type { AuthenticatedSession } from '../auth/types.js'
import { ZodValidationPipe } from '../common/pipes/zodValidation.pipe.js'
import { ApiKeyService } from './apiKey.service.js'
import { ApiKeyExceptionFilter } from './filters/apiKeyException.filter.js'

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string().regex(/^[a-z_]+:[a-z_]+$/, 'Scopes must use resource:action format')),
  expiresAt: z.string().datetime().nullish(),
})

type CreateApiKeyDto = z.infer<typeof createApiKeySchema>

@ApiTags('API Keys')
@UseFilters(ApiKeyExceptionFilter)
@Controller('api/api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('api_keys:write')
  @ApiOperation({ summary: 'Create an API key for the current organization' })
  @ApiResponse({ status: 201, description: 'API key created' })
  @ApiResponse({ status: 400, description: 'Invalid scopes or expiry date' })
  async create(
    @Session() session: AuthenticatedSession,
    @Body(new ZodValidationPipe(createApiKeySchema)) body: CreateApiKeyDto
  ) {
    return this.apiKeyService.create(session, body)
  }

  @Get()
  @Permissions('api_keys:read')
  @ApiOperation({ summary: 'List API keys for the current organization' })
  @ApiResponse({ status: 200, description: 'List of API keys' })
  async list(@Session() session: AuthenticatedSession) {
    return this.apiKeyService.list(session)
  }

  @Delete(':id')
  @Permissions('api_keys:write')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revoke(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Session() session: AuthenticatedSession
  ) {
    return this.apiKeyService.revoke(id, session)
  }
}
