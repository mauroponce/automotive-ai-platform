# Hetzner deployment

Provision a Docker host and a private Hetzner Object Storage bucket. Copy `.env.production.example` to `.env.production`, configure the domain, Google OAuth callback, distinct owner/application PostgreSQL credentials, authentication secret and private S3 credentials. Keep `OPENAI_PAID_PROCESSING_ENABLED=false` until spending is explicitly authorized. Never expose these values to clients.

```bash
docker compose -f compose.prod.yaml config --quiet
docker compose -f compose.prod.yaml build migrate web worker
docker compose -f compose.prod.yaml up -d
docker compose -f compose.prod.yaml ps
```

Production deployment requires explicit approval immediately before execution. Building these artifacts or opening a PR does not deploy them. Caddy provides HTTPS on ports 80/443; PostgreSQL publishes no host port. The public browser tool works without OpenAI credentials. Weight redistribution remains blocked until [license approval](browser-detector-license.md).

The one-shot migrator installs locked tooling, applies historical migrations, prepares pg-boss and grants the limited `automotive_app` runtime role. Runtime queue code uses `migrate: false`; no queue DDL is attempted with restricted credentials. Trusted cross-tenant service operations still require the server-only owner URL; ordinary tenant queries use RLS on `DATABASE_URL`.

There are three production artifacts: web (`IMAGE_TAG`), worker (`WORKER_IMAGE_TAG`) and migrator (`MIGRATOR_IMAGE_TAG`). The worker's separate image contains its complete production dependencies, Prisma engine and auxiliary Sharp binaries. Do not substitute the web standalone dependency trace for the worker runtime. Web has an HTTP health check; worker records a heartbeat only after a database probe. Migrator must finish before either starts.

CI quality checks precede container publication. No image is published after a failed quality job. Use reviewed image digests for actual deployment, retain the prior three images for rollback, back up PostgreSQL and private objects, and verify a restore independently. No laboratory volumes or Python/vision services remain. Historical laboratory tables are retained; the [future retirement proposal](data-model.md) requires separate approval.

For uncertain submissions, reconcile the provider Batch metadata before any manual retry. Pending administration pages are not incident tooling; use authorized database/provider operations until dedicated controls exist.
