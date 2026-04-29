# syntax=docker/dockerfile:1.6
ARG NODE_VERSION=20-slim

# ─── Stage 1: deps ─────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# npm ci is reproducible but locks platform-specific optional deps to whatever
# generated the lockfile (e.g. darwin-arm64 from macOS). Tailwind v4's CSS
# pipeline needs lightningcss-linux-x64-gnu at build time, which isn't in the
# Mac-generated lock. Per lightningcss + npm/cli#4828, the fix is to drop the
# lockfile and let npm install resolve optionalDependencies for this platform.
RUN rm -f package-lock.json && npm install --no-audit --no-fund

# ─── Stage 2: build ────────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: runtime (next standalone) ────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
