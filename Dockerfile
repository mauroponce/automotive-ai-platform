FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates postgresql-client && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run db:generate

FROM base AS development
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

FROM base AS builder
ENV NODE_ENV=production
RUN npm run build
RUN npm run build:worker

FROM base AS migrator
CMD ["bash", "ops/migrate.sh"]

FROM builder AS worker-dependencies
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS worker
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=worker-dependencies /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/worker.cjs"]

FROM node:24-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "server.js"]
