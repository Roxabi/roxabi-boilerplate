export const meta = {
  name: 'multi-agent-audit',
  description: 'Multi-agent code quality audit for roxabi-boilerplate (Bun/TS monorepo)',
  phases: [
    { title: 'Structural Checks', detail: 'Boundaries, custom lint, typecheck' },
    { title: 'Domain Audits', detail: '8 domains across API / web / packages partitions' },
    { title: 'Synthesis', detail: 'Generate AUDIT-SUMMARY.md' },
  ],
}

// Ported from roxabi-factory/docs/workflows/multi-agent-audit.js
// Adapted for: Bun + TurboRepo + TypeScript, NestJS+Fastify+Drizzle (apps/api),
// TanStack Start+Vite+Tailwind (apps/web), shared packages (@repo/*).

const allTasks = []

const DOMAIN_FOCUS = {
  architecture:
    'NestJS layering (controller -> service -> repository), module boundaries, circular deps, @repo/types import boundary (apps/web must NOT import @repo/types/api; apps/api must NOT import @repo/types/ui), god modules, cross-cutting concerns in wrong layer, leaky abstractions across apps/packages. Search for: deep relative imports across app boundaries, direct DB access in controllers, business logic in routes.',
  security:
    'OWASP Top 10, MULTI-TENANT ISOLATION (tenant_id leakage / missing tenant scoping in queries is critical for this SaaS), RBAC/authZ gaps, JWT/session handling, Drizzle SQL injection (raw sql`` with interpolation), secrets in code, input validation (DTO/zod), GDPR/consent enforcement, unsafe eval. Search for: sql.raw, process.env leaks, missing @UseGuards, queries without tenant filter, hardcoded secrets, eval, dangerouslySetInnerHTML.',
  'code-smells':
    'God services/classes, long functions (>80 lines), DRY violations, deep nesting, high cyclomatic complexity, dead code, duplicated logic across modules, prop drilling, oversized React components. Search for: repeated query/validation blocks, large service files, duplicated mappers.',
  'type-safety':
    'any usage, as-casts (as any, as unknown as), @ts-ignore / @ts-expect-error, non-null assertions (!.), implicit any, missing return types on exported fns, unsafe type narrowing. Search for: ": any", "as any", "@ts-ignore", "@ts-expect-error", "!.", "as unknown".',
  'async-patterns':
    'Floating/unawaited promises, missing await, unhandled rejections, N+1 queries (Drizzle in loops), blocking sync IO, race conditions in handlers, queue/job leaks, missing transaction boundaries. Search for: db calls inside .map/.forEach, async without await, .then without catch, await in loop, missing transaction wrapping multi-write.',
  'error-handling':
    'Empty catch blocks, swallowed errors, generic throw new Error, missing exception filters, no logging on failure, unhandled API errors in web, missing error boundaries. Search for: "catch {}", "catch (e) {}", "// ignore", throw new Error( without context, missing @Catch filters.',
  'test-quality':
    'Coverage gaps on critical paths (auth, rbac, tenant, billing), tests without assertions, mock overuse, flaky patterns, shared mutable state, missing integration coverage of guards/filters. Search for: it( without expect, vi.mock at module top hiding behavior, global state mutation, no teardown.',
  'tech-debt':
    'TODO/FIXME/HACK/XXX markers, deprecated APIs, magic numbers/strings, hardcoded URLs/IDs, console.log left in, unused imports/exports, stale comments, commented-out code. Search for: TODO, FIXME, HACK, XXX, console.log, deprecated, hardcoded localhost/ports.',
}

const PARTS = {
  // --- apps/api (NestJS + Fastify + Drizzle) ---
  P1: {
    patterns: 'apps/api/src/auth/**, apps/api/src/rbac/**, apps/api/src/api-key/**',
    desc: 'AuthN/AuthZ, RBAC, API keys',
  },
  P2: {
    patterns: 'apps/api/src/user/**, apps/api/src/organization/**, apps/api/src/tenant/**',
    desc: 'Users, orgs, multi-tenancy',
  },
  P3: {
    patterns:
      'apps/api/src/admin/**, apps/api/src/system-settings/**, apps/api/src/feature-flags/**',
    desc: 'Admin, settings, feature flags',
  },
  P4: {
    patterns:
      'apps/api/src/consent/**, apps/api/src/gdpr/**, apps/api/src/audit/**, apps/api/src/purge/**',
    desc: 'Consent, GDPR, audit, purge (compliance)',
  },
  P5: {
    patterns:
      'apps/api/src/common/**, apps/api/src/config/**, apps/api/src/database/**, apps/api/src/email/**, apps/api/src/queue/**, apps/api/src/throttler/**, apps/api/src/v1/**',
    desc: 'Cross-cutting infra, DB, queue, v1 API',
  },
  // --- apps/web (TanStack Start) ---
  P6: {
    patterns:
      'apps/web/src/routes/**, apps/web/src/integrations/**, apps/web/src/hooks/**, apps/web/src/config/**',
    desc: 'Web routes, integrations, hooks',
  },
  P7: {
    patterns: 'apps/web/src/components/**, apps/web/src/lib/**',
    desc: 'Web components, client libs',
  },
  // --- packages ---
  P8: {
    patterns:
      'packages/ui/src/**, packages/types/src/**, packages/config/**, packages/email/**, packages/cli/**',
    desc: 'Shared packages (ui, types, config, email, cli)',
  },
  // --- tests (colocated *.test.ts(x) + __tests__/ + *.spec.ts) ---
  T1: {
    patterns: 'apps/api/src/**/*.spec.ts, apps/api/src/**/*.test.ts, apps/api/src/**/__tests__/**',
    desc: 'API unit/integration tests',
  },
  T2: {
    patterns: 'apps/web/src/**/*.test.ts, apps/web/src/**/*.test.tsx, apps/web/src/test/**',
    desc: 'Web tests',
  },
  T3: {
    patterns: 'packages/**/*.test.ts, packages/**/*.test.tsx, apps/**/e2e/**, apps/**/*.e2e.*',
    desc: 'Package + e2e tests',
  },
}

const WAVE_DEFS = [
  { domain: 'architecture', parts: ['P1', 'P2', 'P3', 'P4'] },
  { domain: 'architecture', parts: ['P5', 'P6', 'P7', 'P8'] },
  { domain: 'security', parts: ['P1', 'P2', 'P3', 'P4'] },
  { domain: 'security', parts: ['P5', 'P6', 'P7', 'P8'] },
  { domain: 'code-smells', parts: ['P1', 'P2', 'P3', 'P4'] },
  { domain: 'code-smells', parts: ['P5', 'P6', 'P7', 'P8'] },
  { domain: 'type-safety', parts: ['P1', 'P2', 'P3', 'P4'] },
  { domain: 'type-safety', parts: ['P5', 'P6', 'P7', 'P8'] },
  { domain: 'async-patterns', parts: ['P1', 'P2', 'P3', 'P4'] },
  { domain: 'async-patterns', parts: ['P5', 'P6', 'P7', 'P8'] },
  { domain: 'error-handling', parts: ['P1', 'P2', 'P3', 'P4'] },
  { domain: 'error-handling', parts: ['P5', 'P6', 'P7', 'P8'] },
  { domain: 'test-quality', parts: ['T1', 'T2', 'T3'] },
  { domain: 'tech-debt', parts: ['P1', 'P2', 'P3', 'P4'] },
  { domain: 'tech-debt', parts: ['P5', 'P6', 'P7', 'P8'] },
]

function buildPrompt(domain, partition) {
  const focus = DOMAIN_FOCUS[domain]
  const part = PARTS[partition]
  const outPath = 'artifacts/analyses/quality-audit/' + domain + '/' + partition + '.md'
  return (
    'You are a senior code quality auditor. Analyze ' +
    domain.toUpperCase() +
    ' for partition ' +
    partition +
    ' (' +
    part.desc +
    ') in the roxabi-boilerplate project.\n\n' +
    '## Files to analyze\n' +
    'Glob patterns: ' +
    part.patterns +
    '\n' +
    'Use `Glob` and `Read` to explore these files. Focus on files that match the domain criteria. Skip node_modules, dist, .turbo.\n\n' +
    '## Focus\n' +
    focus +
    '\n\n' +
    '## Key context\n' +
    '- Multi-tenant SaaS boilerplate. Tenant isolation is a primary correctness AND security concern.\n' +
    '- apps/api: NestJS + Fastify + Drizzle ORM. Pattern: controller -> service -> repository.\n' +
    '- apps/web: TanStack Start + Vite + Tailwind v4. File-based routing under src/routes.\n' +
    '- packages/*: @repo/ui, @repo/types (split api/ui), @repo/config, @repo/email, @repo/cli.\n' +
    '- Import boundary (enforced by `bun run lint:custom`): apps/web !-> @repo/types/api ; apps/api !-> @repo/types/ui.\n' +
    '- Style: single quotes, no semicolons, 2-space indent, trailing commas es5. Biome is the formatter/linter.\n\n' +
    '## Output\n' +
    'Write findings to: ' +
    outPath +
    '\n\n' +
    '## Format\n' +
    '### Summary (1-2 sentences)\n' +
    '### Findings\n' +
    '| severity | file | line | description |\n' +
    '|---|------|------|-------------|\n\n' +
    'P0 = critical | P1 = high | P2 = medium | P3 = low\n\n' +
    '### Metrics\n' +
    '- files_audited: N\n' +
    '- issues_found: N\n' +
    '- P0: N | P1: N | P2: N | P3: N\n\n' +
    '### Recommendations (prioritized, with effort estimate)\n\n' +
    'Rules:\n' +
    '- Cite exact file paths and line numbers\n' +
    '- If no issues found, say "No issues found" in Summary\n' +
    '- Do NOT invent findings\n' +
    '- Use `Grep` to search for patterns, then `Read` to verify\n' +
    '- If a pattern has no matches, report it as clean\n'
  )
}

phase('Structural Checks')

// Equivalent of the playbook's axial-drift / importlinter step, adapted to this repo:
// the @repo/types import boundary + Drizzle injection custom lint, plus typecheck.
const structuralPrompt =
  'You are an architecture boundary auditor for roxabi-boilerplate (Bun/TS monorepo).\n\n' +
  '## Tasks\n' +
  '1. Run `bun run lint:custom` (checks DRIZZLE injection + @repo/types import boundary). Capture the output.\n' +
  '2. Run `bun run typecheck` and capture any errors (summarize counts per package, do not paste thousands of lines).\n' +
  '3. Grep for cross-app boundary violations: apps/web importing @repo/types/api, apps/api importing @repo/types/ui, and deep relative imports crossing app boundaries (e.g. "../../api" from web).\n\n' +
  '## Output\n' +
  'Write to: artifacts/analyses/quality-audit/structural/boundaries-report.md\n\n' +
  '## Format\n' +
  '### lint:custom result (pass/fail + violations)\n' +
  '### typecheck result (error count per package)\n' +
  '### Boundary violations (table: file | line | violation)\n' +
  '### Summary (1-2 sentences)\n\n' +
  'Rules: cite exact file:line, do not invent, if a command is unavailable note it and continue.\n'

const structural = await agent(structuralPrompt, {
  label: 'structural-boundaries',
  phase: 'Structural Checks',
})

for (let i = 0; i < WAVE_DEFS.length; i++) {
  const wave = WAVE_DEFS[i]
  for (let j = 0; j < wave.parts.length; j++) {
    const part = wave.parts[j]
    allTasks.push({ domain: wave.domain, partition: part, prompt: buildPrompt(wave.domain, part) })
  }
}

log('Total audit tasks: ' + allTasks.length)

phase('Domain Audits')

const results = await pipeline(allTasks, (task) =>
  agent(task.prompt, { label: task.domain + '-' + task.partition, phase: 'Domain Audits' })
)

log('Domain audits completed: ' + results.filter(Boolean).length + '/' + allTasks.length)

phase('Synthesis')

const domains = []
for (let i = 0; i < WAVE_DEFS.length; i++) {
  const d = WAVE_DEFS[i].domain
  if (domains.indexOf(d) === -1) {
    domains.push(d)
  }
}

let reportsList = ''
for (let i = 0; i < domains.length; i++) {
  reportsList += '- artifacts/analyses/quality-audit/' + domains[i] + '/*.md\n'
}

const synthPrompt =
  'You are the audit synthesis lead for roxabi-boilerplate. Read ALL domain audit reports in artifacts/analyses/quality-audit/ and produce a comprehensive AUDIT-SUMMARY.md.\n\n' +
  '## Reports to read\n' +
  reportsList +
  '- artifacts/analyses/quality-audit/structural/boundaries-report.md\n\n' +
  '## Output\n' +
  'Write to: artifacts/analyses/quality-audit/AUDIT-SUMMARY.md\n\n' +
  '## Required sections\n' +
  '1. Executive Summary - overall health, top 3 risks, debt score (0-100)\n' +
  '2. Critical Issues (P0) - table with file, line, issue, recommended fix\n' +
  '3. High Priority (P1) - table\n' +
  '4. Medium Priority (P2) - table\n' +
  '5. Low Priority (P3) - table\n' +
  '6. Tenant Isolation & Boundary Summary - table of multi-tenant + @repo/types boundary findings\n' +
  '7. Metrics Dashboard - domain | total issues | P0 | P1 | P2 | P3\n' +
  '8. Debt Score - 0-100 (100 = clean, 0 = critical), justified with metrics\n' +
  '9. Top 10 Quick Wins - low effort, high impact fixes\n' +
  '10. Recommended Actions - prioritized roadmap with effort estimates\n\n' +
  'Rules:\n' +
  '- Dedupe findings across partitions\n' +
  '- If a report is missing or empty, note it\n' +
  '- Debt score must be justified with metrics\n' +
  '- Do NOT invent findings\n' +
  '- If reports are incomplete, say so and list what is missing\n'

const synthesis = await agent(synthPrompt, { label: 'synthesis', phase: 'Synthesis' })

return {
  structural: structural ? 'done' : 'failed',
  completed: results.filter(Boolean).length,
  total: allTasks.length,
  synthesis: synthesis ? 'done' : 'failed'
}
