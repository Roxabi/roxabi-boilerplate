import { Inject, Injectable } from '@nestjs/common'
import type { FeatureFlag } from '@repo/types'
import { FEATURE_FLAG_REPO, type FeatureFlagRepository } from './featureFlags.repository.js'

@Injectable()
export class FeatureFlagService {
  private static readonly CACHE_TTL_MS = 60_000

  /**
   * Per-instance in-memory cache with 60s TTL.
   * In multi-instance deployments, other instances may serve stale values
   * for up to 60s after a write on a different instance.
   */
  private cache = new Map<string, { value: boolean; expiresAt: number }>()

  /**
   * Pending-promise cache to prevent stampede under concurrent load.
   * Multiple concurrent calls for the same key share the same DB promise.
   */
  private pending = new Map<string, Promise<boolean>>()

  constructor(@Inject(FEATURE_FLAG_REPO) private readonly repo: FeatureFlagRepository) {}

  async isEnabled(key: string): Promise<boolean> {
    const cached = this.cache.get(key)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value
    }

    const pending = this.pending.get(key)
    if (pending) {
      return pending
    }

    const promise = this.loadAndCache(key)
    this.pending.set(key, promise)

    try {
      return await promise
    } finally {
      this.pending.delete(key)
    }
  }

  private async loadAndCache(key: string): Promise<boolean> {
    const row = await this.repo.findByKey(key)
    if (!row) return false

    this.cache.set(key, {
      value: row.enabled,
      expiresAt: Date.now() + FeatureFlagService.CACHE_TTL_MS,
    })

    return row.enabled
  }

  async getAll(): Promise<FeatureFlag[]> {
    return this.repo.findAll()
  }

  async getById(id: string): Promise<FeatureFlag | null> {
    return this.repo.findById(id)
  }

  async create(data: { name: string; key: string; description?: string }): Promise<FeatureFlag> {
    const row = await this.repo.create(data)
    this.cache.delete(data.key)
    return row
  }

  async update(
    id: string,
    data: { name?: string; description?: string; enabled?: boolean }
  ): Promise<FeatureFlag | null> {
    const row = await this.repo.update(id, data)

    if (row?.key) {
      this.cache.delete(row.key)
    }

    return row
  }

  async delete(id: string): Promise<void> {
    const row = await this.repo.delete(id)

    if (row?.key) {
      this.cache.delete(row.key)
    }
  }
}
