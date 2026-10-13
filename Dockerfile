FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run db:generate

FROM base AS development
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

FROM base AS production
ENV NODE_ENV=production
RUN npm run build
RUN npm prune --omit=dev
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm run start"]
