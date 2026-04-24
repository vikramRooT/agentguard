# AgentGuard governance API — production image.
#
# Multi-stage build: (1) install deps + compile TS, (2) copy only the
# compiled JS + prod deps into a small runtime image.
#
# Build from the repo root:
#   docker build -f apps/api/Dockerfile -t agentguard-api:local .

# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm (pinned to package.json's "packageManager" field).
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace manifests first for better caching.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile --filter @agentguard/api...

# Copy source + build.
COPY apps/api ./apps/api
RUN pnpm --filter @agentguard/api build

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime

RUN apk add --no-cache tini
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost:4000/health >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/index.js"]
