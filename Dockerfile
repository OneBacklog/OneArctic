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
  org.opencontainers.image.authors="Irfan Fadiilah <hello@irfanfadilah.com>"

RUN mkdir -p /app/data/db /app/data/files

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/server/database/migrations ./server/database/migrations
COPY scripts/ ./scripts/

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
