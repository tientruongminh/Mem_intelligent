FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/telegram-collector/package.json ./apps/telegram-collector/package.json
COPY apps/mcp-server/package.json ./apps/mcp-server/package.json
COPY packages/domain/package.json ./packages/domain/package.json
COPY packages/application/package.json ./packages/application/package.json
COPY packages/infrastructure/package.json ./packages/infrastructure/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --no-frozen-lockfile

RUN find apps packages -type d -name node_modules -prune -exec rm -rf {} + 2>/dev/null || true

COPY apps ./apps
COPY packages ./packages
COPY prisma ./prisma
COPY vitest.config.ts eslint.config.mjs .prettierrc.json ./

ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG API_PROXY_TARGET=http://api:4000
ENV API_PROXY_TARGET=$API_PROXY_TARGET
RUN pnpm install --offline --frozen-lockfile && pnpm db:generate && pnpm --filter @tsi/web build

ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@tsi/api", "start"]
