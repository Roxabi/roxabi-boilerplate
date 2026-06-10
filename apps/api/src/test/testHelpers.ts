import { Test, type TestingModule } from '@nestjs/testing'

/**
 * Shared test utilities for NestJS integration tests.
 * Provides helper functions for common test operations.
 */

/**
 * Test user data for integration tests
 */
export const TEST_AUTH_USER = {
  id: 'test-user-1',
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
}

export const TEST_AUTH_USER_2 = {
  id: 'test-user-2',
  email: 'test2@example.com',
  password: 'TestPassword456!',
  name: 'Another User',
}

/**
 * Test organization data
 */
export const TEST_ORG = {
  id: 'test-org-1',
  name: 'Test Organization',
  slug: 'test-org',
}

/**
 * Test role data
 */
export const TEST_ROLES = {
  admin: {
    id: 'role-admin',
    name: 'Admin',
    slug: 'admin',
  },
  member: {
    id: 'role-member',
    name: 'Member',
    slug: 'member',
  },
  viewer: {
    id: 'role-viewer',
    name: 'Viewer',
    slug: 'viewer',
  },
}

/**
 * Test permissions
 */
export const TEST_PERMISSIONS = {
  userRead: {
    resource: 'user',
    action: 'read',
  },
  userWrite: {
    resource: 'user',
    action: 'write',
  },
  orgRead: {
    resource: 'organization',
    action: 'read',
  },
  orgWrite: {
    resource: 'organization',
    action: 'write',
  },
}

/**
 * Create a test module with specified imports
 * @param imports - NestJS module imports
 * @returns Compiled TestingModule
 */
export async function createTestModule(
  // biome-ignore lint/suspicious/noExplicitAny: NestJS module imports are not uniformly typed
  imports: any[]
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports,
  }).compile()
}

/**
 * Dynamically import and create test module
 * @param modulePath - Relative path to module (e.g., '../auth.module')
 * @param moduleName - Module class name (e.g., 'AuthModule')
 * @returns TestingModule or null if module not found
 */
export async function createModuleFromPath(
  modulePath: string,
  moduleName: string
): Promise<TestingModule | null> {
  try {
    const moduleImport = await import(modulePath).catch(() => null)
    if (moduleImport?.[moduleName]) {
      return await Test.createTestingModule({
        imports: [moduleImport[moduleName]],
      }).compile()
    }
    return null
  } catch {
    return null
  }
}

/**
 * Get service from test module
 * @param module - TestingModule
 * @param serviceName - Service name or class
 * @returns Service instance or null
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic default needed for flexible service retrieval
export function getService<T = any>(
  module: TestingModule,
  // biome-ignore lint/complexity/noBannedTypes: NestJS module.get() accepts Function
  serviceName: string | Function
): T | null {
  try {
    return module.get<T>(serviceName, { strict: false }) || null
  } catch {
    return null
  }
}

/**
 * Check if service has method
 * @param service - Service instance
 * @param methodName - Method name
 * @returns true if method exists and is callable
 */
// biome-ignore lint/suspicious/noExplicitAny: Test introspection helper requires any
export function hasMethod(service: any, methodName: string): boolean {
  return service && typeof service[methodName] === 'function'
}

/**
 * Check if service has multiple methods
 * @param service - Service instance
 * @param methodNames - Array of method names
 * @returns true if all methods exist
 */
// biome-ignore lint/suspicious/noExplicitAny: Test introspection helper requires any
export function hasMethods(service: any, methodNames: string[]): boolean {
  return methodNames.every((method) => hasMethod(service, method))
}
