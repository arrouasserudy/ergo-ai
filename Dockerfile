# syntax=docker/dockerfile:1
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
# Toolchain in case better-sqlite3 has to compile from source.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time placeholders only; real values come from Fly secrets/env at runtime.
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_PATH=/tmp/build.db \
    BETTER_AUTH_SECRET=build-time-placeholder-secret-not-used-at-runtime \
    BETTER_AUTH_URL=http://localhost:3000
# Create and migrate the build database once: `next build` collects page data in
# parallel workers that each open it, and racing to create it fails with SQLITE_BUSY.
RUN pnpm exec tsx -e 'import("./src/db/index.ts")'
RUN pnpm build

FROM node:22-slim AS runner
# sqlite3 CLI for inspecting the database over `fly ssh console`.
RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# sqlite-vec imports its platform binary package by a computed name, which tracing
# can't follow through pnpm's symlinks; Node finds it here by walking up.
COPY --from=build /app/node_modules/.pnpm/sqlite-vec-linux-x64@*/node_modules/sqlite-vec-linux-x64 ./node_modules/sqlite-vec-linux-x64
# Same for the Claude Agent SDK's CLI binary (Claude subscription provider).
COPY --from=build /app/node_modules/.pnpm/@anthropic-ai+claude-agent-sdk-linux-x64@*/node_modules/@anthropic-ai/claude-agent-sdk-linux-x64 ./node_modules/@anthropic-ai/claude-agent-sdk-linux-x64
# Migrations are applied automatically on startup (src/instrumentation-node.ts).
COPY --from=build /app/drizzle ./drizzle
EXPOSE 3000
CMD ["node", "server.js"]
