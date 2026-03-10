# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries are generated automatically by `/promote` and committed to staging before the promotion PR.

## [v0.8.1] - 2026-03-10

### Fixed
- fix(preview): move bypass secret to runtime Nitro server route (#489)
- fix(docs): use turbo-ignore for Vercel ignoreCommand (#490)

### Documentation
- docs: sync proxy and ignoreCommand references (#491)

## [v0.8.0] - 2026-03-10

### Added
- feat(docs): add standalone Fumadocs docs site at docs.app.roxabi.com (#474, #476, #479)
- feat(auth): notify existing user on duplicate sign-up attempt (#465)
- feat(talks): add Lyra product/startup talk (#451, #467)
- feat(talks): improve lyra-story design — typography, layout, visual polish (#466, #468)

### Fixed
- fix(preview): wire web→API preview URL and bypass Vercel Deployment Protection (#483)
- fix(ci,docs): MDX checker + dashboard-ported fixes (#482)
- fix(docs): run codegen before next build in Vercel deployment (#480)
- fix(ci,api,web): apply review findings from PR #475 (#477, #478)
- fix(e2e): remove stale docsHeaderLink assertion after docs route removal

### Documentation
- docs(deployment): document VERCEL_AUTOMATION_BYPASS_SECRET setup (#484)
- docs: sync docs and docker-compose for last 2-3 days of changes (#481)

### Maintenance
- chore(web): remove docs route and fumadocs infrastructure (#472)
- chore(talks): remove talks routes — migrated to roxabi-talks (#471)
- chore(lint): ignore talks/ directory in Biome config
- chore(deps): bump lucide-react from 0.576.0 to 0.577.0 (#473)
- chore(security): update vulnerable dependencies (#469, #470)

## [v0.7.0] - 2026-03-06

### Added
- feat(auth): implement API key Bearer fallback in AuthGuard (#448, #319)
- feat(talks): add Lyra origin story presentation (#452, #453, #456)
- feat(talks): add Lyra companion component with 7 evolving variants (#452, #455)
- feat(talks): display Lyra avatar animation in origin story talk (#458)
- feat(talks): add Lyra MMORPG dev talk presentation (#450, #460)
- feat(talks): add Lyra companion avatar + narrative improvements to lyra-dev talk (#450, #463)
- feat(docs): add frontmatter check and group docs quality gates

### Fixed
- fix(auth): magic link callbackURL missing at request time + Mailpit + E2E coverage (#446)
- fix(web): use API_PORT env fallback in server session fetcher (#462)
- fix(ci): add contents:read to merge-reports job permissions (#461)
- fix(ci): add Mailpit service and disable rate limiting for E2E jobs
- fix(ci): allowlist artifacts/ and docs/ dirs in gitleaks
- fix(ci): scope vercel-env-check to actual deployment triggers
- fix(dev): add NITRO_PORT to prevent collision with API PORT
- fix(dev): source .env at shell level so turbo receives env vars
- fix(dev): source .env in dev:clean so EMAIL_PORT override is respected
- fix(docker): use grep -E instead of -P for Alpine compatibility
- fix(e2e): derive test credentials from APP_SLUG to match seed fixtures
- fix(api): update env validation tests PORT→API_PORT
- fix(talks): set lyra-story avatar defaults to constellation/400/bottom-left

### Changed
- refactor(api): extract focused sub-services for SRP compliance (#449, #400)
- refactor(env): rename PORT→API_PORT, WEB_PORT→APP_PORT + hardcoded port env var fallbacks

### Tests
- test(seed): change default preset from minimal to full

### Documentation
- docs: add badges and doc table to README, add CONTRIBUTING.md

### Maintenance
- chore(web): low-priority code quality cleanup (#447)
- chore: remove memory-audit plugin
- chore: use APP_SLUG for docker defaults and seed data
- chore(docker): configurable Mailpit ports, env var container/volume names, EMAIL_PORT passthrough
- chore(dev): Docker health check improvements and auto-start in predev
- chore(ci): add docs:links check to lefthook pre-push

## [v0.6.0] - 2026-03-03

### Added
- feat(dev-core): add stack.yml config as reference consumer
- feat(skills): redesign memory-audit — drain-to-zero + audit log + recurrence detection
- feat(dashboard): add workflow runs section for deploy-preview

### Fixed
- fix(api): handle Resend failures gracefully and extract global EmailModule (#413)
- fix(api): move softDeleteCache from file scope to class property (#414)
- fix(api): unify user anonymization logic between purge paths (#416)
- fix(api): harden path param validation, CRON_SECRET, and Swagger exposure (#418)
- fix(api): domain exception standards — typed throws + Object.setPrototypeOf (#417)
- fix(api): prevent auth tokens from being logged in console email fallback (#415)
- fix(api): move setting exceptions to system-settings and remove Auth/Rbac circular dep (#419)
- fix(api,web): serializable tx on admin update (M3), tighten CSP, devtools to devDeps (#436)
- fix(api): log full verification URL in dev console email fallback
- fix(build): resolve Shiki4 SSR OOM with lazy splits and heap increase
- fix(dx): add class-validator and fix tsup clean race condition in dev
- fix(env): add dev-core tooling vars to TOOLING_ALLOWLIST (#441)
- fix(frontend): extract profile fetch to lib + promote ApiKey types (#440)
- fix(web): add serverConsent to initial router context
- fix(ci): generate ephemeral BETTER_AUTH_SECRET for API preview deploys
- fix(ci): restore shared package dist/ in E2E jobs via turbo cache
- fix(ci): upload hidden .output/ dir by enabling include-hidden-files
- fix(ci): force turbo build to bypass silent cache-hit output loss
- fix(e2e): fix full E2E test suite — 16 failures → 0 (#439)
- fix(e2e): fix consent fixture policyVersion and mobile nav waitForSelector
- fix(e2e): skip org-switcher tests on mobile viewports

### Performance
- perf(ci): implement ADR-004 + CI parallelism improvements

### Changed
- refactor(api): extract shared utilities and consolidate exception filters
- refactor(web): extract validateEnvPlugin as named Plugin function (#442)

### Tests
- test(e2e): expand Playwright coverage for 5 missing flows (#429)

### Documentation
- docs(guides): add new feature pattern guide (#428)
- docs(architecture): add ADR-004 SSR consent and data fetching patterns

### Maintenance
- chore(plugins): consume dev-core and memory-audit from Roxabi plugin repo
- chore(deps): bun update — biome 2.4.5, lucide-react 0.576.0, shiki 4.0.0
- chore(deps): batch dependabot updates (#437)
- chore(ci): disable PR Review & Auto-fix workflow
- chore(agents): set explicit sonnet model on architect, product-lead, security-auditor

## [v0.5.1] - 2026-02-27

### Fixed
- fix(ci): replace raw Neon API bash with official neondatabase/create-branch-action@v6 and delete-branch-action@v3
- fix(devops): move all env vars to globalPassThroughEnv, remove api turbo.json
- fix(ci): update prReview test to match staging-only trigger
- ci(pr-review): only run automated review on staging PRs

### Maintenance
- chore(deps): update dependencies and patch 4 CVEs via overrides

## [v0.5.0] - 2026-02-27

### Added
- feat(skills): atomic /dev workflow orchestrator (#366)
- feat(admin): system settings admin page + backend (#367)
- feat(auth): magic link edge cases (#368)
- feat(admin): self-role-change with confirmation + sole-owner guard (#369)
- feat(talks): add dev-process deep-dive talk (#372)
- feat(admin): add feature flags admin page + backend with cache (#380)
- feat(ci): automated PR review & auto-fix pipeline (#385)
- feat(web): enhance landing page hero with two-column layout (#397)
- feat(web): extend dev-process talk with new deep-dive sections (#399)

### Fixed
- fix(web): replace per-guard session fetch with root context auth pattern (#382)
- fix(ci): prevent silent failures in PR Review & Auto-fix workflow (#393)
- fix(agents): add missing task tools, WebFetch, and skills to all agents (#394)
- fix: ADR skill meta.json corruption and feature-flags query migration (#395)
- fix(docs): documentation accuracy audit — fix 55 inaccuracies across 26 files (#391)
- fix(web): remove env.server import from routePermissions to silence Vite import warning
- fix(ci): harden deploy-preview — async deletion wait, dynamic role/db discovery, neondb_owner + pooled=false for connection URI

### Documentation
- docs(standards): Phase 1 practical standards (#383)
- docs(architecture): add backend DDD + Hexagonal vision (#398)

## [v0.4.0] - 2026-02-25

### Added
- feat(web): refresh talks presentation v2 (#362)
- feat(api): schema + shared modules for system settings & feature flags (#360)
- feat(ui): add EmptyState component + design system showcases (#356)
- feat(security): add gitleaks CI scanning and security threat model (#343)
- feat(web): add kebab + right-click context menus to admin tables (#342)
- feat(api-key): implement API key CRUD with management UI (#341)
- feat(dx): enforce 500-line file limit with Biome rule + pre-push hook (#340)
- feat(web): centralized route permission map + useCanAccess hook (#338)
- feat(admin): add users list columns and org membership editing (#337)
- feat(bootstrap): add Gate 2.5 smart issue splitting (#309)
- feat(admin): Phase 2 cross-tenant user, org, and audit management (#308)
- feat(review): add root cause analysis, confidence scoring & auto-apply (#307)
- feat(scaffold): add micro-task planning (#303)
- feat(skills): enrich bootstrap with shaping patterns (#294)
- feat(admin): add admin panel layout, member management, and audit foundation (#279)
- feat(types,config): add tsup build steps and split types into domain files (#250)
- feat(auth): auth flow production-readiness fixes (#288)

### Fixed
- fix(cd): reset Neon branch schema before deploy preview migrations
- fix(cd): use --build-env to override DATABASE_URL during Vercel build
- fix(ci): build API alongside web app in E2E jobs
- fix(e2e): correct API entrypoint path in Playwright config (#354)
- fix(vite): enable multi-project path resolution for @repo/* aliases (#345)
- fix(ci): revert upload-artifact to v6 (#304)

### Changed
- refactor: consolidate specs/, analyses/, plans/ into artifacts/ (#355)
- style(naming): standardize file naming conventions (#346) (#352)
- test(#135): comprehensive test coverage expansion — E2E, integration, config (#344)
- refactor: extract sub-functions to fix all noExcessiveLinesPerFunction warnings (#299)
- perf(scaffold,review): token optimization — context injection + security scoping (#328)
- perf(agents): set Sonnet defaults for routine sub-agents (#286) (#324)
- chore(config): add SWAGGER_ENABLED to turbo.jsonc and extend env sync check (#249)
- chore(deps): batch dependency updates from Dependabot (#301)

### Documentation
- docs: fix 22 inaccuracies across 13 documentation files
- docs(spec): add spec for talks presentation v2 refresh (#361)
- docs(spec): add sub-specs for admin phase 3 slices (#357, #358, #359)
- docs(spec): add spec for admin phase 3 system settings + feature flags (#270)
- docs: add admin phase 3 spec and register ADR 002
- docs(workflow): token consumption analysis + complexity scoring rubric (#289)

## [v0.3.0] - 2026-02-18

### Added
- feat(avatar): user avatar system — DiceBear customization & navbar integration (#243)
- feat: auto-select default org, reorganize menus, and improve account lifecycle (#240)
- feat(testing): upgrade testing infrastructure to Gold Standard (#239)
- feat(api): modular seed data system with configurable presets (#238)
- feat(legal): legal compliance, GDPR & cookies (#233)
- feat(account,org): account & organization management (#230)
- feat(bootstrap): add optional investigation step (Gate 1.5) (#231)
- feat(retro): session intelligence pipeline (#232)

### Fixed
- fix(i18n): replace hardcoded strings in settings pages (#244)
- fix(db): use push + stamp instead of broken push + migrate for branch DBs
- fix(ci): run lint/typecheck/test/build on push events
- fix(web): rename env.client to env.shared for TanStack Start 1.161 compat
- fix(docs): fix mermaid diagram text rendering

### Changed
- perf(web): fix CI OOM — move analyses/specs out of Fumadocs, restrict Shiki (#235)
- refactor(web): remove all demo routes, files, and VITE_ENABLE_DEMO env var
- ci(pipeline): harden CI/CD — PR titles, scope-aware skip, docs links, template (#241)
- ci(workflow): close linked issues after auto-merge
- ci(workflow): add auto-merge workflow and review label gate

### Documentation
- docs(onboarding): add mermaid, env enrichment, glossary, demo script (#236)
- docs(analyses): add 16 repo comparison analyses and consolidated summary (#163)
- docs(admin): add analysis and spec for admin panel
- docs(avatar): add analysis and spec for user avatar system
- docs(claude): overhaul CLAUDE.md — add commands, gotchas, structure
- docs(skills): condense skill descriptions (-57% tokens)

### Chores
- chore: upgrade dependencies across monorepo
- chore: migrate biome config schema to 2.4.0

## [v0.2.2] - 2026-02-16

### Fixed
- fix(web): resolve relative links in Fumadocs documentation
- fix(devops): add turbo-ignore devDep and missing passThroughEnv vars
- fix(ci): make Neon branch cleanup tolerant of missing branches
- fix(claude): make project board failures non-fatal in issue-triage scripts

### Documentation
- docs(docs): fix ASCII diagram alignment in architecture pages
- fix(docs): fix dead README link and ASCII arrows in vision page

## [v0.2.1] - 2026-02-16

### Added
- feat(web): add tips & tricks section to claude code presentation
- feat(claude): add show more/less toggle to issues dashboard

### Documentation
- docs: add root-level database scripts to getting-started, configuration, and architecture docs

### Chores
- chore: add db convenience scripts, fix landing page links, and remove guest guard

## [v0.2.0] - 2026-02-15

### Added
- feat(env): harden env var validation across CI/CD pipeline (#197)
- feat(ui,web): Claude Code presentation page + design system expansion (#145)
- feat(api): rate limiting with Upstash Redis & Swagger gating (#148)
- feat(db): local database isolation per worktree (#162)
- feat(ui,web): UX & Design Audit — 41 findings implemented (#177)
- feat(web): internationalize Claude Code presentation and demo routes
- feat(web): add i18n page titles and design-system translation keys
- feat(api): implement database seed script for dev essentials
- feat(web): add catch-all route to render 404 page for unmatched paths
- feat(web): add talks link to navbar
- feat(issue-triage): add create command, parent/child management

### Fixed
- fix: apply 25 non-blocking findings from staging audit (#180)
- fix: resolve 25 review findings across backend, frontend, devops, and tests (#149)
- fix(env): address review findings for env var hardening
- fix(web): use optional chaining for UnsavedChangesDialog callbacks
- fix(web): make UnsavedChangesDialog props optional to match useBlocker types
- fix(config): use wildcard env patterns in turbo.jsonc to prevent drift
- fix(web): prioritize cookie and browser language over URL for locale detection
- fix: replace dev trap with explicit dev:clean script for port cleanup
- fix(web): exclude internal docs from production build to fix OOM
- fix(web): preserve selected theme when editing non-color settings
- fix: update license to BSL 1.1 and fix GitHub link in prod
- fix(ci): install Vercel CLI and Turbo in deploy preview workflow
- fix(ci): base64-encode database URL to bypass GitHub Actions secret masking
- fix(ci): validate Neon secrets before API calls

### Changed
- perf(web): switch to async MDX loading and Rolldown bundler to fix OOM
- refactor(web): extract sub-components from OrgSettingsPage to reduce cognitive complexity
- refactor(web): overhaul presentation sections layout and content
- refactor(agents): rename infra-ops to devops, add expert review to bootstrap
- refactor(bootstrap): remove team spawn, use direct orchestration
- refactor(promote): move changelog generation before merge to fix deploy race
- test: align test suite with updated testing standards (#191)

### Documentation
- docs(guides): add RBAC and multi-tenant usage guides (#196)
- docs(guides): expand troubleshooting guide with common issues (#195)
- docs(deploy): update docs for Vercel Marketplace integration migration (#198)
- docs(architecture): add frontend, CI/CD, multi-tenant, auth-security, RBAC subsystem docs (#169)
- docs(infra): add analysis and spec for Vercel Marketplace migration
- docs(env): add analysis and spec for env var hardening epic
- docs(security): add analysis and spec for rate limiting & API security
- docs(presentation): add analysis and spec for Claude Code talk page
- docs(db): integrate branch database scripts into project documentation

### Chores
- chore(license): switch from BUSL-1.1 to MIT
- chore(deps): bump actions/cache, setup-node, upload-artifact, checkout (#184, #186, #187, #188)
- chore(deps): bump the minor-and-patch group with 3 updates (#189)
- chore(deps): update outdated dependencies (#161)
- chore(web): remove unused content-collections dependency
- chore(config): align Biome schema version with CLI 2.3.15

## [v0.1.0] - 2026-02-13

### Added
- feat(api,web): add auth + users with Better Auth (#73)
- feat(api): add multi-tenant RLS infrastructure (#111)
- feat(api): implement RBAC roles and permissions (#116)
- feat(auth): implement auth UI/UX pages and flows (#108)
- feat(auth): conditionally show OAuth buttons based on provider config (#123)
- feat(web): setup API client (#62)
- feat(web): migrate i18n from i18next to Paraglide JS (#66)
- feat(web): clean TanStack Start installation with landing page (#67)
- feat(design-system): add theme engine, presets, and design system page (#83)
- feat(deploy): deployment setup with Vercel (#100)
- feat(claude): implement 9 Claude Code skills for full dev lifecycle (#74)
- feat(agents): implement 10-agent team architecture (#79)
- feat(license-checker): add dependency license compliance scanner (#82)
- feat(promote): add release notes system with --finalize flag (#138)
- feat: UI component migration and monorepo cleanup (#69)

### Fixed
- fix(web): resolve i18n Suspense/hydration loop issues (#63)
- fix(config): align ports, env vars, and runtime versions (#98)
- fix(auth): reject default BETTER_AUTH_SECRET in production (#99)
- fix(auth): add error handling to ResendEmailProvider.send() (#102)
- fix(api): add security headers and explicit column selection (#104)
- fix(api): add CORS credentials, database-unavailable filter, error boundary (#120)
- fix(api): resolve Biome lint warnings in RBAC service (#124)
- fix(i18n): backend error messages are not translated on frontend (#128)
- fix(agents): agent team & process audit (#129)
- fix(api): run drizzle-kit through tsx to resolve ESM .js extensions (#139)

### Changed
- refactor(api): migrate correlation ID from interceptor to nestjs-cls middleware (#103)
- refactor: code quality fixes from project audit (#110)
- test: increase coverage to meet 70% thresholds (#76)
- test: close critical test coverage gaps from audit (#134)
- ci(e2e): add auto-trigger, browser caching, and production server (#81)
- ci: add staging branch and on-demand preview deploys (#115)
- ci(api): run Drizzle DB migrations in CI/CD pipeline (#142)
- docs(standards): add coding standards & best practices (#65)
- docs: fix stale docs and add missing guides from audit (#107)
- docs: fix stale documentation from freshness audit (#122)
- docs(processes): overhaul dev process and agent coordination (#125)
- chore(process): overhaul dev workflow with multi-domain review and fixer agent (#133)
- chore(infra): improve Turbo cache hits and align Biome versions (#97)
- chore(security): pre-production security hardening (#105)
- chore: resolve low-priority audit backlog (#109)
- chore: tech debt remediation from project audit (#112)
- chore(web): align demo pages with design system (#113)
- chore(deps): monorepo hygiene fixes from health audit (#121)
