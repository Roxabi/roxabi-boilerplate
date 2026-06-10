import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  Global,
  Inject,
  Logger,
  Module,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common'
import {
  drizzleProvider,
  POSTGRES_CLIENT,
  type PostgresClient,
  postgresClientProvider,
} from './drizzle.provider.js'

type JournalEntry = {
  idx: number
  tag: string
}

type MigrationJournal = {
  entries: JournalEntry[]
}

@Global()
@Module({
  providers: [postgresClientProvider, drizzleProvider],
  exports: [drizzleProvider, postgresClientProvider],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseModule.name)

  constructor(@Inject(POSTGRES_CLIENT) private readonly client: PostgresClient | null) {}

  async onModuleInit() {
    if (!this.client) {
      this.logger.warn('No database connection — skipping startup checks')
      return
    }

    const client = this.client
    await this.ping(client)
    await this.checkCoreTables(client)
    await this.checkPendingMigrations(client)
  }

  private async ping(client: PostgresClient) {
    try {
      await client`SELECT 1`
      this.logger.log('Database connection verified')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Database connection failed: ${message}`)
    }
  }

  private async checkCoreTables(client: PostgresClient) {
    const coreTables = ['users', 'sessions', 'accounts', 'verifications'] as const

    try {
      const rows = await client`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ${client(coreTables)}
      `
      const existing = new Set(rows.map((r) => r.table_name as string))
      const missing = coreTables.filter((t) => !existing.has(t))

      if (missing.length > 0) {
        this.logger.warn(
          `Missing core tables: ${missing.join(', ')}. ` +
            'These tables are created by Better Auth at first startup. ' +
            'Run "drizzle-kit push --force" to create all tables from the schema, ' +
            'or start the app with a valid DATABASE_URL to let Better Auth create them.'
        )
      } else {
        this.logger.log('All core tables verified')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Could not verify core tables: ${message}`)
    }
  }

  private async checkPendingMigrations(client: PostgresClient) {
    let journal: MigrationJournal
    try {
      const journalPath = join(process.cwd(), 'drizzle', 'migrations', 'meta', '_journal.json')
      const content = await readFile(journalPath, 'utf-8')
      journal = JSON.parse(content) as MigrationJournal
    } catch {
      this.logger.debug('No migration journal found — skipping migration check')
      return
    }

    const expected = journal.entries?.length ?? 0
    if (expected === 0) return

    let applied = 0
    try {
      const rows = await client`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`
      applied = rows[0]?.count ?? 0
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!message.includes('relation "drizzle.__drizzle_migrations" does not exist')) {
        this.logger.error(`Migration table check failed: ${message}`)
      }
      applied = 0
    }

    const pending = expected - applied
    if (pending > 0) {
      this.logger.warn(`${pending} pending migration(s) detected. Run "bun db:migrate" to apply.`)
    } else {
      this.logger.log('All migrations are up to date')
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.end()
      this.logger.log('Database connection closed')
    }
  }
}
