import * as schema from '../../src/database/schema/index.js'
import type { FixtureContext, Preset, SeedResult, Tx } from './types.js'

/** Create one consent record per user. */
export async function seed(tx: Tx, _preset: Preset, ctx: FixtureContext): Promise<SeedResult> {
  for (const userId of ctx.userIds) {
    await tx.insert(schema.consentRecords).values({
      id: crypto.randomUUID(),
      userId,
      categories: { necessary: true, analytics: false, marketing: false },
      policyVersion: '2026-02-v1',
      action: 'rejected',
      ipAddress: '0.0.0.0',
      userAgent: 'roxabi-seed/1.0',
    })
  }
  return { consentCount: ctx.userIds.length }
}
