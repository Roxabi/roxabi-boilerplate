# =============================================================================
# Web Dockerfile — Multi-stage build (TanStack Start + Nitro SSR)
# Build context: repo root (.)
# Usage: docker build -f apps/web/Dockerfile .
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------------------------
FROM oven/bun:1.3 AS deps

WORKDIR /app

# Copy lockfile and workspace package manifests for dependency resolution
COPY bun.lock package.json turbo.jsonc ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/
COPY packages/ui/package.json packages/ui/

RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: Build the TanStack Start application
# ---------------------------------------------------------------------------
FROM oven/bun:1.3 AS build

WORKDIR /app

# Copy hoisted node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY packages/types/ packages/types/
COPY packages/config/ packages/config/
COPY packages/ui/ packages/ui/
COPY apps/web/ apps/web/

# Build the web app — Nitro bundles all runtime deps into .output/
WORKDIR /app/apps/web
RUN bun run build

# ---------------------------------------------------------------------------
# Stage 3: Production runtime (minimal image)
# Nitro bundles all dependencies — no node_modules needed
# ---------------------------------------------------------------------------
FROM node:26-slim AS runtime

WORKDIR /app

# Nitro self-contained output: server bundle + static assets
COPY --from=build /app/apps/web/.output ./.output

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD node -e "fetch('http://localhost:3000').then(r => { if (!r.ok) throw 1 })" || exit 1

# Nitro SSR entry point (confirmed via playwright.config.ts)
CMD ["node", ".output/server/index.mjs"]
