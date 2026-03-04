import { SetMetadata } from '@nestjs/common'

/**
 * Restrict a controller or route to API key authentication only.
 * Rejects session-auth requests with 401 API_KEY_REQUIRED.
 * Note: @AllowAnonymous() does NOT override this decorator.
 */
export const RequireApiKey = () => SetMetadata('REQUIRE_API_KEY', true)
