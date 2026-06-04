export const baseConfig = {
  passWithNoTests: false,
  watch: false,
  reporters: ['default'],
  testTimeout: 10000,
  // Cap forks per run. Default = availableParallelism - 1 (~23 on a 24-core box).
  // Combined with `turbo --concurrency`, keeps total procs ≈ concurrency × maxForks ≤ cores.
  pool: 'forks',
  poolOptions: {
    forks: { minForks: 1, maxForks: 4 },
  },
}
