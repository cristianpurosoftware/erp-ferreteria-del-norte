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
COPY package.json package-lock.json* tsconfig.json ./
RUN npm ci --ignore-scripts
COPY src ./src
RUN npm run build

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
CMD ["node", "build/index.js"]
