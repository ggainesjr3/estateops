# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

FROM deps AS dev
RUN apk add --no-cache curl wget
COPY packages ./packages
COPY apps/api ./apps/api
COPY turbo.json ./
EXPOSE 3001
ENV NODE_ENV=development
CMD ["pnpm", "--filter", "@estateops/api", "dev"]

FROM deps AS builder
COPY packages ./packages
COPY apps/api ./apps/api
COPY turbo.json ./
RUN pnpm --filter @estateops/shared build && pnpm --filter @estateops/api build

FROM node:20-alpine AS prod
RUN apk add --no-cache curl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./node_modules/@estateops/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@estateops/shared/package.json
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health/live || exit 1
CMD ["node", "dist/main.js"]
