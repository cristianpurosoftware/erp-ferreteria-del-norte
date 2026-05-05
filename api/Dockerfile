# syntax=docker/dockerfile:1.6
ARG NODE_VERSION=20-alpine

# ─── Stage 1: production-only dependencies ─────────────────────
FROM node:${NODE_VERSION} AS deps-prod
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

# ─── Stage 2: build (needs dev deps for tsc) ───────────────────
FROM node:${NODE_VERSION} AS build
WORKDIR /app
# Override NODE_ENV here so npm ci installs devDependencies (tsc, types,
# faker for seed compilation) even when Coolify injects NODE_ENV=production
# at build time.
ENV NODE_ENV=development
COPY package.json package-lock.json* tsconfig.json ./
RUN npm ci --include=dev --ignore-scripts
COPY src ./src
# scripts/ NOT copied: it contains build-time helpers (CSV→JSON pre-bake)
# whose presence shifts tsc's inferred rootDir and moves outputs into
# build/src/* instead of build/*.
RUN npm run build
# Copy non-TS asset files needed by compiled seeds (catalog JSON, etc.)
RUN mkdir -p build/seeds/demo \
 && cp -R src/seeds/demo/. build/seeds/demo/

# ─── Stage 3: runtime ──────────────────────────────────────────
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
ENV PORT=8081
WORKDIR /app

# Curl for healthcheck debugging; tini for PID 1 signal handling.
RUN apk add --no-cache tini curl

COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./

EXPOSE 8081
USER node
ENTRYPOINT ["/sbin/tini", "--"]
# Run migrations on every container start, then boot the API. Migrations are
# idempotent (TypeORM tracks applied ones in the migrations table). This
# avoids Coolify's pre_deployment_command edge case where the very first
# deploy has no running container to exec into.
CMD ["sh", "-c", "npm run migrate:prod && if [ \"$SEED_FERRETERIA_DEMO\" = \"true\" ]; then npm run seed:ferreteria:prod; fi && node build/index.js"]
