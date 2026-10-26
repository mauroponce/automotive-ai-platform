# Automotive AI Platform

Two modes: free single-photo license plate blur entirely in the browser, and an authorized advanced editing pilot using backend OpenAI Image Edit. React/TypeScript/ONNX/Canvas power the public tool. Next.js, Node.js, PostgreSQL/Prisma, pg-boss and private S3 power the pilot. Every generated result requires human review.

## Development

```bash
cp .env.example .env.local
docker compose up --build
# Optional private object storage and worker:
docker compose --profile object-storage --profile workers up --build
```

Open http://localhost:3000. The public tool needs no login or API key and sends no photo to the server. All public plate routes reuse the existing Canvas editor. Automatic suggestions require correction; no detections never guarantees no plate. The bundled weights are **not approved for commercial redistribution**; see [model provenance](docs/browser-detector-license.md).

Google OAuth credentials are required for real sign-in. Registration starts an exact 14-day organization trial. The trial only grants portal access; advanced work additionally requires a manually provisioned pilot batch allowance. Paid dispatch is disabled unless both `APP_DEMO_MODE=false` and `OPENAI_PAID_PROCESSING_ENABLED=true` are explicitly authorized server-side. Never enable these for tests.

## Verification

```bash
npm ci
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run build
npm run build:worker
npx playwright install chromium
npm run test:e2e
```

`npm run test:integration` uses a **disposable** migrated PostgreSQL database with distinct owner/runtime URLs and a private S3 test bucket. It skips connected tests when services are not configured. See [local development](docs/local-development.md) for environment and acceptance coverage; CI supplies both services. Provider responses in integration tests are explicitly simulated, never paid inference.

See [architecture](docs/architecture.md), [commercial decisions](docs/comercial.md), [deployment](docs/hetzner-deployment.md), [OpenAI verification](docs/openai-setup.md) and [roadmap](docs/roadmap.md). Credits and payments are pending; no subscription or payment provider is implemented in this sprint.
