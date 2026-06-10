import { Inject, Injectable } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { ClsService } from 'nestjs-cls'
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider.js'
import { DatabaseUnavailableException } from './exceptions/databaseUnavailable.exception.js'
import { TenantContextMissingException } from './exceptions/tenantContextMissing.exception.js'

/** Transaction context passed to tenant-scoped callbacks. */
type TenantTx = Parameters<NonNullable<DrizzleDB>['transaction']>[0] extends (
  tx: infer TX
) => unknown
  ? TX
  : never

@Injectable()
export class TenantService {
  constructor(
    private readonly cls: ClsService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB | null // RLS-BYPASS: tenant setup — manages RLS via SET LOCAL ROLE
  ) {}

  /**
   * Execute a callback within a tenant-scoped transaction.
   * Reads tenantId from CLS (set by TenantInterceptor).
   * Sets `app.tenant_id` via `set_config()` before running the callback.
   *
   * @throws TenantContextMissingException if no tenantId is available in CLS
   */
  async query<T>(callback: (tx: TenantTx) => Promise<T>): Promise<T> {
    const tenantId = this.cls.get('tenantId') as string | null

    if (!tenantId) {
      throw new TenantContextMissingException()
    }

    return this.executeWithTenant(tenantId, callback)
  }

  /**
   * Execute a callback with an explicit tenant context.
   * Use this for cron jobs, background tasks, or cross-tenant admin operations
   * where no HTTP request (and thus no CLS context) exists.
   */
  async queryAs<T>(tenantId: string, callback: (tx: TenantTx) => Promise<T>): Promise<T> {
    return this.executeWithTenant(tenantId, callback)
  }

  private async executeWithTenant<T>(
    tenantId: string,
    callback: (tx: TenantTx) => Promise<T>
  ): Promise<T> {
    if (!this.db) {
      throw new DatabaseUnavailableException()
    }

    return this.db.transaction(async (tx) => {
      // Switch to app_user role — RLS policies are enforced for this role
      await tx.execute(sql`SET LOCAL ROLE app_user`)
      // Set tenant context for this transaction — RLS policies read this value
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`)

      return callback(tx)
    })
  }
}
