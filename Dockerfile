FROM node:24-slim AS base
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-slim AS production
WORKDIR /app
ENV NODE_ENV=production
LABEL org.opencontainers.image.title="OneArctic" \
  org.opencontainers.image.description="Personal Note-Taking App" \
  org.opencontainers.image.authors="Irfan Fadilah <hello@irfanfadilah.com>" \
  org.opencontainers.image.source="https://github.com/OneBacklog/OneArctic" \
  org.opencontainers.image.licenses="AGPL-3.0-only"

RUN mkdir -p /app/data/db /app/data/files && chown -R node:node /app/data

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/server/database/migrations ./server/database/migrations
COPY scripts/ ./scripts/
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
