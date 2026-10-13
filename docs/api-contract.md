# API contract

`POST /api/v1/jobs` accepts vehicle/showroom/prompt UUIDs, selected model, quality, and an idempotency key; it returns `202` and a queued job. `GET /api/v1/jobs`, `GET /api/v1/showrooms`, and `GET /api/v1/usage` return consistent `{data, meta}` envelopes. `POST /api/v1/assets/upload-authorizations` validates upload metadata and issues a short-lived private S3-compatible upload URL. API-key middleware remains required before exposing the commercial API publicly.
