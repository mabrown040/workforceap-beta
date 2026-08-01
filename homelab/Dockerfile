# WorkforceAP production image for Proxmox homelab (Docker Compose).
# Build context: repository root (see homelab/docker-compose.yml).

FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@10.34.3 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_STANDALONE=1
ENV HOMELAB_DEPLOY=1
ENV NODE_ENV=production
RUN pnpm exec prisma generate && pnpm exec next build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
