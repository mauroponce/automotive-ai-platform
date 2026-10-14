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

The default local stack exposes the app at http://localhost:3000 and PostgreSQL only on its internal Docker network. Basic V1 stores its private image files under `data/basic-edit/` on the local machine and makes no OpenAI or S3 request. The local detector is an evaluation-only aid; every suggested plate region must be reviewed manually.

MinIO and the background worker are reserved for object-storage and asynchronous flows: `docker compose --profile object-storage --profile workers up --build`. Default local MinIO credentials are documented in `.env.example`; change them outside development.

Run database migrations with `docker compose exec web npm run db:migrate` and seed the prompt/model registry with `docker compose exec web npx tsx prisma/seed.ts`.

See `docs/hetzner-deployment.md` for Hetzner, `docs/openai-setup.md` for explicit paid inference authorization, and `docs/api-contract.md` for the API.

For the local Basic V1 plate-blur workflow, see `docs/local-basic-plate-blur.md`.
