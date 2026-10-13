# Automotive AI Photo Platform

An OpenAI-first, multi-tenant automotive photo evaluation MVP. It is self-hosted with PostgreSQL, Auth.js, pg-boss, S3-compatible private object storage, and Docker Compose. It preserves original vehicle photos as records and labels every generated result as unverified until human review.

## Start locally

```bash
cp .env.example .env.local
docker compose up --build
```

Open http://localhost:3000. The supplied environment starts in safe demo mode and makes no OpenAI call. Use `docker compose down` to stop it.

## Verification

```bash
npm ci
npm run typecheck && npm run lint && npm test && npm run build
```

The local stack exposes the app at http://localhost:3000, PostgreSQL only on its internal Docker network, MinIO's S3 API at http://localhost:9000, and MinIO Console at http://localhost:9001. Default local MinIO credentials are documented in `.env.example`; change them outside development.

Run database migrations with `docker compose exec web npm run db:migrate` and seed the prompt/model registry with `docker compose exec web npx tsx prisma/seed.ts`.

See `docs/hetzner-deployment.md` for Hetzner, `docs/openai-setup.md` for explicit paid inference authorization, and `docs/api-contract.md` for the API.
