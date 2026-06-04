# =============================================================================
# API Dockerfile — Multi-stage build
# Build context: repo root (.)
# Usage: docker build -f apps/api/Dockerfile .
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install all dependencies (dev included for build step)
# ---------------------------------------------------------------------------
FROM oven/bun:1.3 AS deps

WORKDIR /app

# Copy lockfile and workspace package manifests for dependency resolution
COPY bun.lock package.json turbo.jsonc ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/

RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: Build the NestJS application
# ---------------------------------------------------------------------------
FROM oven/bun:1.3 AS build

WORKDIR /app

# Copy hoisted node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy source code (workspace packages needed for type resolution during build)
COPY packages/types/ packages/types/
COPY packages/config/ packages/config/
COPY apps/api/ apps/api/

WORKDIR /app/apps/api
RUN bunx nest build

# ---------------------------------------------------------------------------
# Stage 3: Production-only dependencies
# ---------------------------------------------------------------------------
FROM oven/bun:1.3 AS prod-deps

WORKDIR /app

COPY bun.lock package.json turbo.jsonc ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/

RUN bun install --frozen-lockfile --production

# ---------------------------------------------------------------------------
# Stage 4: Production runtime (minimal image)
# ---------------------------------------------------------------------------
FROM node:26-slim AS runtime

WORKDIR /app

# Copy compiled JS output
COPY --from=build /app/apps/api/dist ./dist

# Copy production-only node_modules (hoisted at root)
COPY --from=prod-deps /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Health check — endpoint is /health (no global API prefix)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD node -e "fetch('http://localhost:4000/health').then(r => { if (!r.ok) throw 1 })" || exit 1

CMD ["node", "dist/index.js"]
