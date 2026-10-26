# Local development and acceptance checks

Copy `.env.example` to `.env.local`, then run `docker compose up --build`. Web listens on port 3000; PostgreSQL stays private. The one-shot migrator creates the limited role, applies all migrations, prepares queues and grants runtime access. Source is bind-mounted for development.

For storage and the worker, add `--profile object-storage --profile workers`. MinIO is development/CI only and now builds a pinned, digest-checked official source release with `Dockerfile.storage`, because the old community image is no longer downloadable. Its console/API bind to loopback. Production continues to use Hetzner S3. Create the private `automotive-assets` bucket before uploading, using the MinIO console at http://localhost:9001 and the local-only credentials from `.env.example`. No anonymous bucket policy is needed.

Run `npm ci`, `npm run db:generate`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run build:worker`. Lint excludes generated vendored `/ort/` JavaScript. After deleting routes, clear stale `.next/types`/`.next/dev/types` caches if an old dev server left validators behind.

## Browser acceptance

Install Chromium with `npx playwright install chromium`, then run `npm run test:e2e` after a production build. Playwright starts an isolated app on port 3100 with paid processing disabled. Synthetic and checked-in illustrative fixtures exercise real local ONNX/WASM loading, positive automatic suggestions, manual correction/resizing, zoom/pan, Canvas export, anonymous download and network assertions rejecting image uploads or external requests. It also verifies removed routes return 404. This proves the browser transport/interaction contract, not detector recall on real plates.

## Persistent pilot acceptance

Use only disposable PostgreSQL and S3 resources. Set `DATABASE_URL` to the limited app role and `MIGRATION_DATABASE_URL` to its owner, plus `POSTGRES_APP_PASSWORD`/`POSTGRES_DB`; run `npm run db:migrate`. Configure `S3_ENDPOINT`, `S3_REGION=us-east-1`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` and `S3_FORCE_PATH_STYLE=true`, then run `npm run test:integration`.

CI supplies PostgreSQL 16 and source-built MinIO. Connected tests skip if services are absent. The pilot test uploads actual validated fixtures, creates a dealership-owned showroom, reserves manual allowance, checks concurrent idempotency and persisted pg-boss messages, consumes the real queues through production handlers with an explicitly simulated provider, persists/reconciles outputs, reviews, downloads and denies a second organization. Session identity is simulated at the Auth.js boundary; separate unit tests cover Google verification/linking, registration and exact trial expiry. Real Google consent/redirects require configured staging credentials and manual verification. No test calls paid OpenAI.

For worker checks use an empty disposable queue, start `npm run worker` or the worker image, wait for `Vehicle batch worker ready`, and check `/tmp/automotive-worker-health`. Do not point tests at a live queue or use production keys. Submission ambiguity deliberately requires operator reconciliation rather than automatic paid retries.
